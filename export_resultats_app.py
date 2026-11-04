"""Convertit le resultats.json du notebook version9d au format lu par l'API (/stats/modele).

Utilisation : python export_resultats_app.py "chemin/resultats.json"
Écrit app/model/resultats.json. Toutes les valeurs proviennent du notebook ; aucune n'est recalculée.
"""
import json
import sys

source = json.load(open(sys.argv[1], encoding="utf-8"))
mc = source["meilleure_cible"]
mt = source["metriques_test"]
METRIQUES = ["RMSE", "MAE", "MAPE", "WAPE", "R2"]

# Nom affiché -> clé du notebook (transformation de la cible retenue sur la validation)
MODELES = {nom: f"{nom}__{mc[nom]}" for nom in mc}
REFERENCES = {"Persistance y(t-1)": "Persistance__-", "Saisonnier y(t-12)": "Saisonnier y(t-12)__-",
              "Moyenne historique route": "Moyenne historique route__-"}

metriques_test = {nom: {m: mt[cle]["M+1"][m] for m in METRIQUES} for nom, cle in {**MODELES, **REFERENCES}.items()}

# Prévision récursive M+1 à M+3 sur le même ensemble de test (les noms suivent ceux du tableau de bord)
HORIZON = {"Random Forest": MODELES["Random Forest"], "XGBoost": MODELES["XGBoost"], "LSTM": MODELES["LSTM"],
           "Persistance": "Persistance__-"}
resultats = [{"Modele": nom, "Horizon": h, **{m: mt[cle][h][m] for m in METRIQUES}}
             for nom, cle in HORIZON.items() for h in ["M+1", "M+2", "M+3"]]

sortie = {
    "version": source["version"],
    "genere_le": source["genere_le"],
    "split": source["split"],
    "meilleure_cible": mc,
    "metriques_test": metriques_test,
    "backtest_multi_horizon": {"n_observations": source["split"]["test"]["observations"], "resultats": resultats},
    "selection_deploiement": source["selection_deploiement"],
}
with open("app/model/resultats.json", "w", encoding="utf-8") as f:
    json.dump(sortie, f, ensure_ascii=False, indent=2)
print("Ecrit : app/model/resultats.json")
print({k: round(v["WAPE"], 2) for k, v in metriques_test.items()})
