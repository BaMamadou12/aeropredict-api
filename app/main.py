"""
API de prévision du trafic aérien — Couche Backend (FastAPI + Pydantic).

Garantie anti-fuite de données PAR CONSTRUCTION : les schémas Pydantic
n'acceptent que l'origine et la destination d'une liaison. Il n'existe
aucun champ permettant de fournir Seats/Flights du mois courant — le
client ne PEUT PAS soumettre de donnée d'offre contemporaine, quelle
que soit sa requête. Les prédictions sont précalculées au moment de
l'export (voir notebook_export_cell.py) à partir du snapshot de
features déjà pré-traité ; ce service ne fait qu'un lookup.

Multi-horizon (v4) : le snapshot contient désormais les prédictions pour
3 horizons (M+1, M+2, M+3). Le client choisit l'horizon via le champ
`horizon` (1, 2 ou 3).
"""
import json
import os
from typing import Literal

import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")

app = FastAPI(
    title="API de prévision du trafic aérien",
    description="Mémoire M2 IA & Smart Tech — Mamadou BA, UIDT. "
                 "Documentation interactive testable directement ci-dessous.",
    version="3.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# Chargement des artefacts au démarrage
# ----------------------------------------------------------------------
with open(os.path.join(MODEL_DIR, "modeles_disponibles.json")) as f:
    MODELES_DISPONIBLES: list[str] = json.load(f)

snapshot = pd.read_parquet(os.path.join(MODEL_DIR, "route_snapshot.parquet"))
snapshot = snapshot.set_index(["origin_airport", "destination_airport"], drop=False)

ModeleType = Literal["xgboost", "random_forest", "mlp"]

MAX_HORIZON = 3


# ----------------------------------------------------------------------
# Schémas Pydantic (contrat d'entrée/sortie strict)
# ----------------------------------------------------------------------
class PredictionRequest(BaseModel):
    origin: str = Field(..., min_length=3, max_length=3, description="Code IATA de l'aéroport de départ, ex. 'ATL'")
    destination: str = Field(..., min_length=3, max_length=3, description="Code IATA de l'aéroport d'arrivée, ex. 'ORD'")
    model: ModeleType = Field("xgboost", description="Modèle tabulaire à utiliser pour la prévision")
    horizon: int = Field(1, ge=1, le=3, description="Horizon de prévision : 1 (M+1), 2 (M+2) ou 3 (M+3) mois")


class BatchPredictionRequest(BaseModel):
    routes: list[PredictionRequest] = Field(..., max_length=200, description="Liste de liaisons à prévoir (200 max par lot)")


class HorizonDetail(BaseModel):
    horizon: int
    mois_cible: str
    passagers_predits: int


class PredictionResponse(BaseModel):
    origin_airport: str
    destination_airport: str
    origin_city: str
    destination_city: str
    distance_miles: float
    modele_utilise: str
    horizon: int
    mois_cible: str
    dernier_mois_connu: str
    derniers_passagers_connus: int
    passagers_predits: int
    tous_horizons: list[HorizonDetail]
    historique_12m_valeurs: list[int]
    historique_12m_mois: list[str]


class HealthResponse(BaseModel):
    status: str
    routes_disponibles: int
    modeles_charges: list[str]
    horizons_disponibles: int


# ----------------------------------------------------------------------
# Logique partagée
# ----------------------------------------------------------------------
def _predire_une_route(origin: str, destination: str, modele: str, horizon: int) -> PredictionResponse:
    origin, destination = origin.upper().strip(), destination.upper().strip()

    if modele not in MODELES_DISPONIBLES:
        raise HTTPException(
            status_code=400,
            detail=f"Modèle '{modele}' non disponible dans cet export. Modèles chargés : {MODELES_DISPONIBLES}",
        )

    if horizon < 1 or horizon > MAX_HORIZON:
        raise HTTPException(
            status_code=400,
            detail=f"Horizon doit être entre 1 et {MAX_HORIZON}. Reçu : {horizon}",
        )

    try:
        row = snapshot.loc[(origin, destination)]
    except KeyError:
        raise HTTPException(
            status_code=404,
            detail=f"Route {origin} -> {destination} absente du snapshot "
                    "(historique insuffisant ou route inconnue du jeu d'entraînement).",
        )

    tous_horizons = []
    for h in range(1, MAX_HORIZON + 1):
        col_mois = f"mois_cible_h{h}"
        col_pred = f"prediction_{modele}_h{h}"
        if col_mois in row.index and col_pred in row.index:
            tous_horizons.append(HorizonDetail(
                horizon=h,
                mois_cible=row[col_mois],
                passagers_predits=int(row[col_pred]),
            ))

    col_pred_sel = f"prediction_{modele}_h{horizon}"
    col_mois_sel = f"mois_cible_h{horizon}"

    return PredictionResponse(
        origin_airport=row["origin_airport"],
        destination_airport=row["destination_airport"],
        origin_city=row["origin_city"],
        destination_city=row["destination_city"],
        distance_miles=float(row["distance_miles"]),
        modele_utilise=modele,
        horizon=horizon,
        mois_cible=row[col_mois_sel],
        dernier_mois_connu=row["dernier_mois_connu"],
        derniers_passagers_connus=int(row["derniers_passagers_connus"]),
        passagers_predits=int(row[col_pred_sel]),
        tous_horizons=tous_horizons,
        historique_12m_valeurs=[int(v) for v in row["historique_12m_valeurs"]],
        historique_12m_mois=list(row["historique_12m_mois"]),
    )


# ----------------------------------------------------------------------
# Endpoints
# ----------------------------------------------------------------------
@app.get("/health", response_model=HealthResponse, tags=["Monitoring"])
def health():
    """Vérifie que l'API tourne et que les modèles/snapshots sont bien chargés en mémoire."""
    return HealthResponse(
        status="ok",
        routes_disponibles=len(snapshot),
        modeles_charges=MODELES_DISPONIBLES,
        horizons_disponibles=MAX_HORIZON,
    )


@app.get("/routes", tags=["Référentiel"])
def list_routes():
    """Liste les liaisons disponibles (pour peupler des menus déroulants côté client)."""
    cols = ["origin_airport", "destination_airport", "origin_city", "destination_city"]
    return snapshot[cols].drop_duplicates().to_dict(orient="records")


@app.post("/predict", response_model=PredictionResponse, tags=["Prévision"])
def predict(payload: PredictionRequest):
    """
    Prévision du trafic pour une liaison unique.
    L'horizon (1, 2 ou 3 mois) détermine la profondeur de la prévision.
    La réponse inclut aussi `tous_horizons` avec les prédictions M+1, M+2, M+3.
    """
    return _predire_une_route(payload.origin, payload.destination, payload.model, payload.horizon)


@app.post("/predict/batch", response_model=list[PredictionResponse], tags=["Prévision"])
def predict_batch(payload: BatchPredictionRequest):
    """Prévision accélérée sur un lot de liaisons (200 maximum par requête)."""
    return [_predire_une_route(r.origin, r.destination, r.model, r.horizon) for r in payload.routes]
