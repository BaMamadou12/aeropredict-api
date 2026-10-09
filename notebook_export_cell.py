# ============================================================================
# EXPORT POUR LE DEPLOIEMENT (v4) -- Multi-horizon (M+1, M+2, M+3)
# ============================================================================
#
# Approche iterative : la prediction de M+h nourrit les lags de M+h+1.
# Chaque modele utilise ses propres predictions pour les horizons suivants.
#
# IMPORTANT : les colonnes categoriques sont DEJA encodees numeriquement
# (Target Encoding, cellule 16). Les codes IATA originaux sont recuperes
# via route_id (cree AVANT l'encodage, cellule 15b).

import joblib
import json
import os

import numpy as np
import pandas as pd

EXPORT_DIR  = DOSSIER_EXPORT
CSV_PATH    = "/content/drive/MyDrive/Colab Notebooks/Data/Airports2 (1).csv"
MAX_HORIZON = 3
os.makedirs(EXPORT_DIR, exist_ok=True)

# ----------------------------------------------------------------------
# 0) Chargement automatique du MLP s'il a ete libere de la memoire
# ----------------------------------------------------------------------
_mlp_candidates = [MLP_PATH, '/content/best_mlp_model.keras',
                   '/content/drive/MyDrive/best_mlp_model.keras']
if 'mlp_model' not in globals():
    for _path in _mlp_candidates:
        if os.path.exists(_path):
            import tensorflow as tf
            from tensorflow.keras.models import load_model
            from tensorflow.keras import mixed_precision
            mixed_precision.set_global_policy('mixed_float16')
            mlp_model = load_model(_path)
            print(f"MLP charge automatiquement depuis {_path}")
            break
    else:
        print("ATTENTION : best_mlp_model.keras introuvable -- predictions MLP non incluses.")

# ----------------------------------------------------------------------
# 1) Mapping IATA -> ville (les codes IATA viennent de route_id, cree avant l'encodage)
# ----------------------------------------------------------------------

_raw_cities = pd.read_csv(CSV_PATH,
                           usecols=['Origin_airport', 'Destination_airport',
                                    'Origin_city', 'Destination_city'],
                           dtype=str)
_city_map = {}
for _, r in _raw_cities.drop_duplicates('Origin_airport').iterrows():
    _city_map[r['Origin_airport']] = r['Origin_city']
for _, r in _raw_cities.drop_duplicates('Destination_airport').iterrows():
    _city_map[r['Destination_airport']] = r['Destination_city']
del _raw_cities

print(f"Mapping IATA -> ville : {len(_city_map)} aeroports")

# ----------------------------------------------------------------------
# 2) Sauvegarde du/des modele(s) tabulaire(s) disponibles
# ----------------------------------------------------------------------
xgb.save_model(f'{EXPORT_DIR}/xgb_model.json')

modeles_disponibles = ['xgboost']

# Random Forest exclu de la production (114 MB, depasse la limite GitHub)

if 'mlp_model' in globals():
    mlp_model.save(f'{EXPORT_DIR}/mlp_model.keras')
    modeles_disponibles.insert(0, 'mlp')  # modele champion en premier (choix par defaut de l'application)

print(f"Modeles exportes : {modeles_disponibles}")

# ----------------------------------------------------------------------
# 3) Reconstruction de l'historique complet, trie par route et par date
# ----------------------------------------------------------------------
_hist_cols = ['Origin_airport', 'Destination_airport',
              'Fly_date', 'Passengers', 'Distance',
              'Origin_population', 'Destination_population',
              'Org_airport_lat', 'Org_airport_long',
              'Dest_airport_lat', 'Dest_airport_long',
              'Origin_city', 'Destination_city',
              'route_id', 'route_avg_passengers']

historique = pd.concat([train[_hist_cols], val[_hist_cols], test[_hist_cols]])\
    .sort_values(['route_id', 'Fly_date'])

derniere_date = historique['Fly_date'].max()

mois_cibles = [(derniere_date + pd.DateOffset(months=h)) for h in range(1, MAX_HORIZON + 1)]
print(f"Derniere date connue : {derniere_date.date()}")
for h, mc in enumerate(mois_cibles, 1):
    print(f"  Horizon M+{h} : {mc.strftime('%Y-%m')}")

# ----------------------------------------------------------------------
# 4) Donnees de base par route (serie temporelle + metadonnees)
# ----------------------------------------------------------------------
# Regroupement par route_id (code IATA) et non par code encode : deux aeroports
# absents du train recoivent le meme Target Encoding et se confondaient.
# Seules les routes actives au dernier mois connu sont exportees.
routes_data = []
n_routes_inactives = 0

for route_id, g in historique.groupby('route_id', sort=True):

    g = g.sort_values('Fly_date')
    if g['Fly_date'].max() != derniere_date:
        n_routes_inactives += 1
        continue
    serie_passagers = g['Passengers'].values.astype('float64')
    dates_serie     = g['Fly_date'].dt.strftime('%Y-%m').values

    if len(serie_passagers) < 24:
        continue

    derniere_ligne = g.iloc[-1]
    iata_orig, iata_dest = route_id.split('__')
    enc_origin, enc_dest = derniere_ligne['Origin_airport'], derniere_ligne['Destination_airport']

    routes_data.append({
        'enc_origin': enc_origin,
        'enc_dest': enc_dest,
        'derniere_ligne': derniere_ligne,
        'serie_passagers': serie_passagers,
        'dates_serie': dates_serie,
        'iata_orig': iata_orig,
        'iata_dest': iata_dest,
    })

n_routes = len(routes_data)
print(f"\nRoutes couvertes par le snapshot : {n_routes:,} (routes inactives exclues : {n_routes_inactives:,})")

# ----------------------------------------------------------------------
# 5) Fonctions utilitaires
# ----------------------------------------------------------------------
def build_features_for_horizon(routes_data, horizon, prev_preds):
    """
    Construit le DataFrame de features pour toutes les routes a un horizon h.

    prev_preds : dict {h_precedent: np.array} avec les predictions des
    horizons anterieurs (propres au modele en cours). Vide pour h=1.

    Approche : on etend la serie observee avec les predictions precedentes,
    puis on extrait les lags depuis la serie etendue.
    """
    mc = mois_cibles[horizon - 1]
    lignes = []

    for idx, rd in enumerate(routes_data):
        serie = rd['serie_passagers']
        dl    = rd['derniere_ligne']

        if horizon == 1:
            extended = serie
        else:
            tail = [prev_preds[h][idx] for h in range(1, horizon)]
            extended = np.concatenate([serie, tail])

        lag_1 = float(extended[-1])
        lag_2 = float(extended[-2])
        lag_3 = float(extended[-3])

        roll_3 = extended[-3:]
        roll_mean = float(np.mean(roll_3))
        roll_std  = float(np.std(roll_3, ddof=1))
        if np.isnan(roll_std):
            roll_std = 0.0

        pos_12 = len(extended) - 12
        pos_24 = len(extended) - 24
        lag_12 = float(extended[pos_12]) if 0 <= pos_12 < len(extended) else float(extended[0])
        lag_24 = float(extended[pos_24]) if 0 <= pos_24 < len(extended) else float(extended[0])

        lignes.append({
            'Origin_airport':        rd['enc_origin'],
            'Destination_airport':   rd['enc_dest'],
            'Origin_city':           dl['Origin_city'],
            'Destination_city':      dl['Destination_city'],
            'Distance':              dl['Distance'],
            'Origin_population':     dl['Origin_population'],
            'Destination_population':dl['Destination_population'],
            'Org_airport_lat':       dl['Org_airport_lat'],
            'Org_airport_long':      dl['Org_airport_long'],
            'Dest_airport_lat':      dl['Dest_airport_lat'],
            'Dest_airport_long':     dl['Dest_airport_long'],
            'Month':                 mc.month,
            'DayOfWeek':             mc.dayofweek,
            'traffic_potential':     np.log1p(float(dl['Origin_population'])
                                              * float(dl['Destination_population'])),
            'Month_sin':             np.sin(2 * np.pi * mc.month / 12),
            'Month_cos':             np.cos(2 * np.pi * mc.month / 12),
            'Day_sin':               np.sin(2 * np.pi * mc.dayofweek / 7),
            'Day_cos':               np.cos(2 * np.pi * mc.dayofweek / 7),
            'Passengers_lag_1':      lag_1,
            'Passengers_lag_2':      lag_2,
            'Passengers_lag_3':      lag_3,
            'Passengers_lag_12':     lag_12,
            'Passengers_lag_24':     lag_24,
            'Passengers_roll_mean_3':roll_mean,
            'Passengers_roll_std_3': roll_std,
            'route_avg_passengers':  float(dl['route_avg_passengers']),
        })

    return pd.DataFrame(lignes)


def scale_features(df_feat):
    X = df_feat[feature_names].apply(pd.to_numeric, errors='coerce').astype('float32')
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)
    return scaler.transform(X).astype('float32')


def predict_model(model_name, X_scaled):
    if model_name == 'xgboost':
        return np.maximum(xgb.predict(X_scaled), 0)
    elif model_name == 'random_forest':
        return np.maximum(rf.predict(X_scaled), 0)
    elif model_name == 'mlp':
        return np.maximum(mlp_model.predict(X_scaled, verbose=0).flatten(), 0)

# ----------------------------------------------------------------------
# 6) Predictions iteratives multi-horizon
#    h=1 : features basees sur les observations reelles
#    h=2 : lag_1 = prediction M+1, les autres lags decalent d'un cran
#    h=3 : lag_1 = prediction M+2, lag_2 = prediction M+1, etc.
#    Chaque modele utilise SES PROPRES predictions anterieures.
# ----------------------------------------------------------------------
preds = {m: {} for m in modeles_disponibles}

# Horizon 1 : une seule matrice de features, commune a tous les modeles
df_h1  = build_features_for_horizon(routes_data, 1, {})
X_h1_s = scale_features(df_h1)
for m in modeles_disponibles:
    preds[m][1] = predict_model(m, X_h1_s)
print(f"\nM+1 : predictions calculees pour {modeles_disponibles}")

# Horizons 2 et 3 : features propres a chaque modele (lags dependants)
for h in range(2, MAX_HORIZON + 1):
    for m in modeles_disponibles:
        df_h  = build_features_for_horizon(routes_data, h, preds[m])
        X_h_s = scale_features(df_h)
        preds[m][h] = predict_model(m, X_h_s)
    print(f"M+{h} : predictions calculees pour {modeles_disponibles}")

# ----------------------------------------------------------------------
# 7) Assemblage du snapshot final
#    Colonnes par horizon : mois_cible_h1/h2/h3
#                           prediction_{modele}_h1/h2/h3
# ----------------------------------------------------------------------
snapshot_final = pd.DataFrame()
snapshot_final['origin_airport']            = [rd['iata_orig'] for rd in routes_data]
snapshot_final['destination_airport']       = [rd['iata_dest'] for rd in routes_data]
snapshot_final['origin_city']               = [_city_map.get(rd['iata_orig'], '') for rd in routes_data]
snapshot_final['destination_city']          = [_city_map.get(rd['iata_dest'], '') for rd in routes_data]
snapshot_final['distance_miles']            = [float(rd['derniere_ligne']['Distance']) for rd in routes_data]
snapshot_final['dernier_mois_connu']        = [rd['derniere_ligne']['Fly_date'].strftime('%Y-%m') for rd in routes_data]
snapshot_final['derniers_passagers_connus'] = [int(rd['serie_passagers'][-1]) for rd in routes_data]
snapshot_final['historique_12m_valeurs']    = [rd['serie_passagers'][-12:].astype(int).tolist() for rd in routes_data]
snapshot_final['historique_12m_mois']       = [rd['dates_serie'][-12:].tolist() for rd in routes_data]

for h in range(1, MAX_HORIZON + 1):
    snapshot_final[f'mois_cible_h{h}'] = mois_cibles[h - 1].strftime('%Y-%m')
    for m in modeles_disponibles:
        snapshot_final[f'prediction_{m}_h{h}'] = np.round(preds[m][h]).astype(int)

snapshot_final.to_parquet(f'{EXPORT_DIR}/route_snapshot.parquet', index=False)

with open(f'{EXPORT_DIR}/modeles_disponibles.json', 'w') as f:
    json.dump(modeles_disponibles, f)

# ----------------------------------------------------------------------
# 8) Resume
# ----------------------------------------------------------------------
print(f"\n{'='*60}")
print(f"Export termine dans {EXPORT_DIR} :")
print(f"  - {', '.join([m + '_model.*' for m in modeles_disponibles])}")
print(f"  - route_snapshot.parquet  ({len(snapshot_final):,} routes)")
print(f"  - modeles_disponibles.json")
print(f"\nHorizons exportes : M+1, M+2, M+3")
print(f"  M+1 = {mois_cibles[0].strftime('%Y-%m')}")
print(f"  M+2 = {mois_cibles[1].strftime('%Y-%m')}")
print(f"  M+3 = {mois_cibles[2].strftime('%Y-%m')}")
print(f"\nColonnes de prediction :")
for m in modeles_disponibles:
    print(f"  {m} : prediction_{m}_h1, prediction_{m}_h2, prediction_{m}_h3")
print(f"\nVerification :")
print(snapshot_final[['origin_airport','destination_airport',
                       'mois_cible_h1','mois_cible_h2','mois_cible_h3']].head())
print(f"\nTelecharge ces fichiers (dont resultats.json) et place-les dans deployment/app/model/")
