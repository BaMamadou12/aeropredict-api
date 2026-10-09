"""
Génère app/model/dataset_stats.json — statistiques descriptives du dataset BTS
affichées dans l'onglet « Statistiques BTS US » du dashboard.

Toutes les valeurs sont calculées à partir du CSV brut (Airports2.csv), sauf
les comptages issus du pipeline du notebook (nettoyage + agrégation route × mois),
repris tels quels depuis les sorties du notebook version7.

Usage :
    python export_dataset_stats.py "C:/Users/DELL/Downloads/Airports2 (1).csv"
"""
import json
import os
import sys

import pandas as pd

MODEL_DIR = os.path.join(os.path.dirname(__file__), "app", "model")

# Sorties du notebook version7 (sections 5b et 15)
NOTEBOOK_OBS_ROUTE_MOIS = 1_042_756
NOTEBOOK_ROUTES_TRAIN = 22_447

MOIS = ["Jan", "Fev", "Mar", "Avr", "Mai", "Jun", "Jul", "Aou", "Sep", "Oct", "Nov", "Dec"]
MOIS_LONG = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout",
             "Septembre", "Octobre", "Novembre", "Decembre"]


def main(csv_path: str) -> None:
    raw = pd.read_csv(
        csv_path,
        usecols=["Origin_airport", "Destination_airport", "Origin_city", "Destination_city",
                 "Passengers", "Fly_date"],
        parse_dates=["Fly_date"],
    )
    snapshot = pd.read_parquet(os.path.join(MODEL_DIR, "route_snapshot.parquet"))

    derniere_annee = int(raw["Fly_date"].dt.year.max())
    annee = raw[raw["Fly_date"].dt.year == derniere_annee]

    par_an = raw.groupby(raw["Fly_date"].dt.year)["Passengers"].sum()
    annee_pic = int(par_an.idxmax())

    saison = annee.groupby(annee["Fly_date"].dt.month)["Passengers"].sum()

    # Trafic aéroport = passagers au départ + à l'arrivée
    trafic_aeroport = (
        annee.groupby("Origin_airport")["Passengers"].sum()
        .add(annee.groupby("Destination_airport")["Passengers"].sum(), fill_value=0)
        .sort_values(ascending=False)
    )
    villes = dict(zip(raw["Origin_airport"], raw["Origin_city"]))
    villes.update(dict(zip(raw["Destination_airport"], raw["Destination_city"])))

    stats = {
        "source": "Bureau of Transportation Statistics (BTS) — Airports2.csv",
        "periode_debut": raw["Fly_date"].min().strftime("%Y-%m"),
        "periode_fin": raw["Fly_date"].max().strftime("%Y-%m"),
        "annee_reference": derniere_annee,
        "brut": {
            "lignes": int(len(raw)),
            "aeroports": int(len(set(raw["Origin_airport"]) | set(raw["Destination_airport"]))),
            "routes": int(raw.groupby(["Origin_airport", "Destination_airport"]).ngroups),
        },
        "notebook": {
            "observations_route_mois": NOTEBOOK_OBS_ROUTE_MOIS,
            "routes_entrainement": NOTEBOOK_ROUTES_TRAIN,
        },
        "snapshot": {
            "routes": int(len(snapshot)),
            "aeroports": int(len(set(snapshot["origin_airport"]) | set(snapshot["destination_airport"]))),
        },
        "passagers_annee_reference": int(par_an[derniere_annee]),
        "annee_pic": annee_pic,
        "passagers_annee_pic": int(par_an[annee_pic]),
        "trafic_annuel": [
            {"annee": int(a), "passagers_millions": round(v / 1e6, 1)} for a, v in par_an.items()
        ],
        "saisonnalite": [
            {"mois": MOIS[m - 1], "label": MOIS_LONG[m - 1], "passagers_millions": round(saison[m] / 1e6, 1)}
            for m in range(1, 13)
        ],
        "top_hubs": [
            {"hub": code, "ville": str(villes.get(code, "")).split(",")[0],
             "passagers_millions": round(v / 1e6, 1)}
            for code, v in trafic_aeroport.head(6).items()
        ],
        "part_top20_hubs_pct": round(100 * trafic_aeroport.head(20).sum() / trafic_aeroport.sum(), 1),
        "nb_aeroports_actifs_annee_reference": int((trafic_aeroport > 0).sum()),
    }

    out = os.path.join(MODEL_DIR, "dataset_stats.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"Écrit : {out}")
    print(json.dumps({k: v for k, v in stats.items() if k not in ("trafic_annuel", "saisonnalite")},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
