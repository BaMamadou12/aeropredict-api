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

with open(os.path.join(MODEL_DIR, "airport_coordinates.json")) as f:
    AIRPORT_COORDS: dict = json.load(f)

snapshot = pd.read_parquet(os.path.join(MODEL_DIR, "route_snapshot.parquet"))
snapshot = snapshot.set_index(["origin_airport", "destination_airport"], drop=False)

ModeleType = Literal["xgboost", "random_forest", "mlp"]

MAX_HORIZON = 3

with open(os.path.join(MODEL_DIR, "dataset_stats.json"), encoding="utf-8") as f:
    DATASET_STATS: dict = json.load(f)

# Cartographie : un seul mois de référence (le dernier mois du dataset).
# Les routes dont la dernière observation est antérieure (lignes fermées)
# sont exclues, pour ne pas additionner des mois différents.
MOIS_REFERENCE: str = snapshot["dernier_mois_connu"].max()
routes_actives = snapshot[snapshot["dernier_mois_connu"] == MOIS_REFERENCE].reset_index(drop=True)


def _route_dict(row) -> dict:
    origin, dest = row["origin_airport"], row["destination_airport"]
    return {
        "origin": origin,
        "destination": dest,
        "origin_city": row["origin_city"],
        "destination_city": row["destination_city"],
        "passengers": int(row["derniers_passagers_connus"]),
        "distance_miles": float(row["distance_miles"]),
        "origin_lat": AIRPORT_COORDS.get(origin, {}).get("lat"),
        "origin_lon": AIRPORT_COORDS.get(origin, {}).get("lon"),
        "dest_lat": AIRPORT_COORDS.get(dest, {}).get("lat"),
        "dest_lon": AIRPORT_COORDS.get(dest, {}).get("lon"),
    }


# Calcul des statistiques agrégées par aéroport (au démarrage)
def _compute_airport_stats() -> dict:
    """Trafic passagers par aéroport (départs + arrivées) au mois de référence."""
    df = routes_actives
    outbound = df.groupby("origin_airport")["derniers_passagers_connus"].sum()
    inbound = df.groupby("destination_airport")["derniers_passagers_connus"].sum()
    n_out = df["origin_airport"].value_counts()
    n_in = df["destination_airport"].value_counts()
    cities = dict(zip(df["destination_airport"], df["destination_city"]))
    cities.update(dict(zip(df["origin_airport"], df["origin_city"])))

    stats = {}
    for code in set(outbound.index) | set(inbound.index):
        out_p = int(outbound.get(code, 0))
        in_p = int(inbound.get(code, 0))
        coords = AIRPORT_COORDS.get(code, {})
        stats[code] = {
            "code": code,
            "city": cities[code],
            "lat": coords.get("lat"),
            "lon": coords.get("lon"),
            "name": coords.get("name", cities[code]),
            "outbound_passengers": out_p,
            "inbound_passengers": in_p,
            "total_passengers": out_p + in_p,
            "routes_count": int(n_out.get(code, 0) + n_in.get(code, 0)),
        }
    return stats

AIRPORT_STATS = _compute_airport_stats()

ROUTES_PAR_TRAFIC = [
    _route_dict(row)
    for _, row in routes_actives.sort_values("derniers_passagers_connus", ascending=False).iterrows()
]


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


# ----------------------------------------------------------------------
# Endpoints Cartographie (données réelles agrégées)
# ----------------------------------------------------------------------
@app.get("/airports", tags=["Cartographie"])
def list_airports(min_passengers: int = 0, limit: int = 50):
    """
    Liste les aéroports avec leurs coordonnées GPS et statistiques de trafic.

    - min_passengers: filtre les aéroports avec au moins ce volume de passagers
    - limit: nombre maximum d'aéroports retournés (triés par trafic décroissant)

    Source des coordonnées: Airports2.csv (BTS)
    Source du trafic: BTS (Bureau of Transportation Statistics) via le snapshot
    """
    airports = [
        a for a in AIRPORT_STATS.values()
        if a["total_passengers"] >= min_passengers and a["lat"] is not None
    ]
    airports.sort(key=lambda x: x["total_passengers"], reverse=True)
    return airports[:limit]


@app.get("/airports/{code}", tags=["Cartographie"])
def get_airport(code: str):
    """Détail d'un aéroport spécifique avec ses statistiques."""
    code = code.upper().strip()
    if code not in AIRPORT_STATS:
        raise HTTPException(status_code=404, detail=f"Aéroport {code} non trouvé")
    return AIRPORT_STATS[code]


@app.get("/routes/top", tags=["Cartographie"])
def top_routes(limit: int = 20):
    """
    Top des liaisons aériennes par volume de passagers.

    Retourne les routes les plus fréquentées avec leurs coordonnées GPS
    pour affichage cartographique.

    Source: BTS (Bureau of Transportation Statistics)
    """
    return ROUTES_PAR_TRAFIC[:limit]


@app.get("/routes/by-airport/{code}", tags=["Cartographie"])
def routes_by_airport(code: str, limit: int = 20):
    """
    Liaisons d'un aéroport spécifique (départs et arrivées).

    Utile pour visualiser le réseau d'un hub particulier.
    """
    code = code.upper().strip()
    routes = [r for r in ROUTES_PAR_TRAFIC if r["origin"] == code or r["destination"] == code]
    return routes[:limit]


@app.get("/stats/network", tags=["Cartographie"])
def network_stats():
    """
    Statistiques globales du réseau aérien pour les KPIs du dashboard.

    Toutes les valeurs sont calculées à partir des données réelles BTS.
    """
    total_airports = len(AIRPORT_STATS)
    airports_with_coords = len([a for a in AIRPORT_STATS.values() if a["lat"] is not None])
    total_passengers = int(routes_actives["derniers_passagers_connus"].sum())
    avg_distance = routes_actives["distance_miles"].mean()

    top_hub = max(AIRPORT_STATS.values(), key=lambda x: x["total_passengers"])
    top_route = ROUTES_PAR_TRAFIC[0] if ROUTES_PAR_TRAFIC else None

    return {
        "reference_month": MOIS_REFERENCE,
        "total_routes": len(routes_actives),
        "snapshot_routes": len(snapshot),
        "total_airports": total_airports,
        "airports_with_coordinates": airports_with_coords,
        "total_passengers_monthly": total_passengers,
        "average_distance_miles": round(avg_distance, 1),
        "top_hub": {
            "code": top_hub["code"],
            "city": top_hub["city"],
            "passengers": top_hub["total_passengers"]
        },
        "top_route": {
            "origin": top_route["origin"],
            "destination": top_route["destination"],
            "passengers": top_route["passengers"]
        } if top_route else None,
        "data_source": "Bureau of Transportation Statistics (BTS)",
        "coordinates_source": "Airports2.csv (BTS)"
    }


@app.get("/stats/dataset", tags=["Cartographie"])
def dataset_stats():
    """
    Statistiques descriptives du dataset BTS (1990-2009) : trafic annuel,
    saisonnalité, top hubs. Générées par export_dataset_stats.py.
    """
    return DATASET_STATS
