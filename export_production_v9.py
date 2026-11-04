"""Export de production v9 : prévisions du Random Forest (et de XGBoost) pour janvier à mars 2010.

Reprend à l'identique la préparation des données du notebook version9d (sections 0 à 9 : nettoyage,
agrégation route × mois, panneau calendaire, variables sans fuite), puis réentraîne les modèles sur
1990-2009 et réécrit app/model/route_snapshot.parquet et app/model/modeles_disponibles.json.

Utilisation : V9_CSV="chemin/Airports2.csv" python export_production_v9.py
"""
import matplotlib
matplotlib.use('Agg')
# %%
import gc
import json
import os
import time
import warnings

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

warnings.filterwarnings('ignore')

try:
    import google.colab  # noqa: F401
    EN_COLAB = True
except ImportError:
    EN_COLAB = False

# Test local rapide sur donnees synthetiques (V9_MODE_TEST=1) : epoques reduites
MODE_TEST = os.environ.get('V9_MODE_TEST') == '1'

if EN_COLAB:
    pass
    from google.colab import drive
    drive.mount('/content/drive')
    CSV_PATH = "/content/drive/MyDrive/Colab Notebooks/Data/Airports2 (1).csv"
    DOSSIER_EXPORT = '/content/drive/MyDrive/deploiement_v9'
else:
    CSV_PATH = os.environ.get('V9_CSV', 'Airports2.csv')
    DOSSIER_EXPORT = os.environ.get('V9_EXPORT', 'export_v9')

DOSSIER_CACHE = f'{DOSSIER_EXPORT}/cache'
DOSSIER_MODELES = f'{DOSSIER_EXPORT}/modeles'
os.makedirs(DOSSIER_CACHE, exist_ok=True)
os.makedirs(DOSSIER_MODELES, exist_ok=True)

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)
rng = np.random.default_rng(RANDOM_STATE)

# Frontieres chronologiques : mois entiers, aucun mois partage entre deux ensembles
FIN_TRAIN  = pd.Timestamp('2005-04-01')
DEBUT_VAL  = pd.Timestamp('2005-05-01')
FIN_VAL    = pd.Timestamp('2007-08-01')
DEBUT_TEST = pd.Timestamp('2007-09-01')
DEBUT_CRISE = pd.Timestamp('2008-09-01')   # effondrement du trafic apres la faillite de Lehman Brothers

CIBLES = ['brut', 'log']           # chaque modele est entraine sur les deux transformations de la cible
HORIZONS = [1, 2, 3]
SEQ_LEN = 12                       # fenetre principale des reseaux recurrents : un cycle saisonnier complet
SEQ_LENS_ETUDE = [6, 12, 24]       # etude de sensibilite a la longueur de fenetre (LSTM)
SVR_ECHANTILLON = 50_000
BATCH_SIZE = 512
EPOCHS_MAX = 3 if MODE_TEST else 100
PATIENCE = 2 if MODE_TEST else 10
N_BOOTSTRAP = 50 if MODE_TEST else 500

RESULTATS = {'version': 'v9'}

print(f"Colab : {EN_COLAB} | mode test : {MODE_TEST}")
print(f"Donnees : {CSV_PATH}")
print(f"Export  : {DOSSIER_EXPORT}")


def cache_charger(nom):
    f = f'{DOSSIER_CACHE}/{nom}.npz'
    return dict(np.load(f)) if os.path.exists(f) else None


def cache_sauver(nom, **tableaux):
    np.savez_compressed(f'{DOSSIER_CACHE}/{nom}.npz', **tableaux)

# %% [markdown]
# ## 1. Chargement du dataset

# %%
dtype_map = {
    'Origin_airport': 'category', 'Destination_airport': 'category',
    'Origin_city': 'category', 'Destination_city': 'category',
    'Origin_population': 'int32', 'Destination_population': 'int32',
    'Seats': 'int32', 'Flights': 'int32', 'Passengers': 'int32',
    'Distance': 'float32',
    'Org_airport_lat': 'float32', 'Org_airport_long': 'float32',
    'Dest_airport_lat': 'float32', 'Dest_airport_long': 'float32',
}
df = pd.read_csv(CSV_PATH, dtype=dtype_map)
df['Fly_date'] = pd.to_datetime(df['Fly_date'], errors='coerce')
print(f"Shape brut : {df.shape}")
RESULTATS['donnees_brutes'] = {
    'lignes': int(len(df)),
    'passengers_moyenne': float(df['Passengers'].mean()),
    'passengers_mediane': float(df['Passengers'].median()),
    'passengers_skewness': float(df['Passengers'].skew()),
    'aeroports_origine': int(df['Origin_airport'].nunique()),
    'aeroports_destination': int(df['Destination_airport'].nunique()),
}
df.describe()

# %% [markdown]
# ## 2. Analyse exploratoire (identique à la v8 : figures du chapitre 2)

# %%
fig, axes = plt.subplots(1, 2, figsize=(14, 5))
axes[0].hist(df['Passengers'], bins=100, color='steelblue', edgecolor='white')
axes[0].set_title('Distribution de Passengers (brut)')
axes[1].hist(np.log1p(df['Passengers']), bins=100, color='coral', edgecolor='white')
axes[1].set_title('Distribution de log1p(Passengers)')
plt.tight_layout()
plt.show()

fig, ax = plt.subplots(figsize=(8, 6))
ax.hist(df['Flights'], bins=50, color='seagreen', edgecolor='white')
ax.set_xlabel('Flights')
ax.set_ylabel("Nombre d'observations")
ax.set_title('Distribution du nombre de vols (Flights)')
plt.tight_layout()
plt.show()

variables_numeriques = ['Passengers', 'Seats', 'Flights']
fig, axes = plt.subplots(len(variables_numeriques), 1, figsize=(8, 4 * len(variables_numeriques)))
for ax, var in zip(axes, variables_numeriques):
    sns.boxplot(x=df[var], color='skyblue', ax=ax)
    ax.set_title(f'Boxplot de {var}')
plt.tight_layout()
plt.show()

print(df.isnull().sum()[lambda s: s > 0])

# %% [markdown]
# ## 3. Nettoyage — valeurs manquantes, doublons, incohérences

# %%
n0 = len(df)
df = df.dropna(axis=0).copy()
n1 = len(df)
df = df.drop_duplicates()
n2 = len(df)
df = df[df['Passengers'] <= df['Seats']]
n3 = len(df)
df = df[~((df['Flights'] == 0) & (df['Passengers'] > 0))]
n4 = len(df)
df = df[~((df['Seats'] == 0) & (df['Flights'] > 0))]
df = df.reset_index(drop=True)
gc.collect()

RESULTATS['nettoyage'] = {
    'lignes_brutes': int(n0), 'dropna': int(n0 - n1), 'doublons_exacts': int(n1 - n2),
    'passengers_sup_seats': int(n2 - n3), 'flights0_passengers_pos': int(n3 - n4),
    'seats0_flights_pos': int(n4 - len(df)), 'total_supprime': int(n0 - len(df)),
    'pct_supprime': float((n0 - len(df)) / n0 * 100), 'lignes_apres_nettoyage': int(len(df)),
}
for k, v in RESULTATS['nettoyage'].items():
    print(f"{k:<26} : {v:,.2f}" if isinstance(v, float) else f"{k:<26} : {v:,}")

# %% [markdown]
# ## 4. Agrégation Route × Mois

# %%
n_avant = len(df)
df = df.groupby(['Origin_airport', 'Destination_airport', 'Fly_date'], observed=True, as_index=False).agg({
    'Passengers': 'sum', 'Seats': 'sum', 'Flights': 'sum', 'Distance': 'first',
    'Origin_city': 'first', 'Destination_city': 'first',
    'Origin_population': 'mean', 'Destination_population': 'mean',
    'Org_airport_lat': 'first', 'Org_airport_long': 'first',
    'Dest_airport_lat': 'first', 'Dest_airport_long': 'first',
})
df['Origin_population'] = df['Origin_population'].astype('int32')
df['Destination_population'] = df['Destination_population'].astype('int32')
RESULTATS['agregation'] = {'lignes_avant': int(n_avant), 'observations_route_mois': int(len(df)),
                           'lignes_fusionnees': int(n_avant - len(df))}
RESULTATS['cible_agregee'] = {
    'passengers_moyenne': float(df['Passengers'].mean()),
    'passengers_mediane': float(df['Passengers'].median()),
    'passengers_max': int(df['Passengers'].max()),
    'passengers_skewness': float(df['Passengers'].skew()),
}
print(f"Observations route x mois : {len(df):,}")
print(f"Cible agregee : moyenne {df['Passengers'].mean():,.0f} | mediane {df['Passengers'].median():,.0f} "
      f"| skewness {df['Passengers'].skew():.2f}")

# %% [markdown]
# ## 5. Variables dérivées, tendance, saisonnalité, corrélations, stationnarité

# %%
df['load_factor'] = np.where(df['Seats'] > 0, df['Passengers'] / df['Seats'], 0).astype('float32')
df['traffic_potential'] = np.log1p(df['Origin_population'].astype('float64')
                                   * df['Destination_population'].astype('float64')).astype('float32')
df['Month'] = df['Fly_date'].dt.month.astype('int8')

serie_totale = df.groupby('Fly_date', observed=True).agg({'Passengers': 'sum', 'Flights': 'sum'}).reset_index()
fig, axes = plt.subplots(2, 1, figsize=(15, 10), sharex=True)
axes[0].plot(serie_totale['Fly_date'], serie_totale['Passengers'], color='blue')
axes[0].set_ylabel('Passagers (total mensuel)')
axes[1].plot(serie_totale['Fly_date'], serie_totale['Flights'], color='green')
axes[1].set_ylabel('Vols (total mensuel)')
plt.tight_layout()
plt.show()

par_mois = df.groupby('Month', observed=True)['Passengers'].sum()
plt.figure(figsize=(8, 5))
plt.bar(par_mois.index, par_mois.values, color='steelblue')
plt.title('Passagers par mois (agrege sur toutes les annees)')
plt.xlabel('Mois')
plt.tight_layout()
plt.show()

plt.figure(figsize=(12, 8))
sns.scatterplot(x='Distance', y='Passengers', data=df.sample(min(len(df), 200_000), random_state=RANDOM_STATE), alpha=0.3)
plt.title('Nombre de passagers en fonction de la distance')
plt.show()

_corr = df.drop(columns=['Month']).corr(numeric_only=True)
plt.figure(figsize=(15, 10))
sns.heatmap(_corr, annot=True, cmap='coolwarm', fmt='.2f')
plt.title('Matrice de correlation (exploratoire — inclut des variables exclues ensuite)')
plt.show()
RESULTATS['correlations'] = {'avec_passengers': {k: float(v) for k, v in _corr['Passengers'].items()},
                             'seats_flights': float(_corr.loc['Seats', 'Flights'])}
print(_corr['Passengers'].sort_values(ascending=False))

RESULTATS['adf'] = {}
try:
    from statsmodels.tsa.stattools import adfuller
    for col in ['Passengers', 'Flights']:
        res = adfuller(serie_totale[col])
        RESULTATS['adf'][col.lower()] = {'statistique': float(res[0]), 'p_value': float(res[1]),
                                         'valeur_critique_5pct': float(res[4]['5%'])}
        print(f"ADF {col} : statistique {res[0]:.2f} | p-value {res[1]:.3f}")
except Exception as e:   # version de statsmodels incompatible : le test ADF n'est pas indispensable a la suite
    print(f"Test ADF non execute : {e}")
del serie_totale, par_mois, _corr
gc.collect()

# %% [markdown]
# ## 6. Diagnostic de la v8 : retards par ligne contre retards calendaires (remarque 2)
#
# En v8, `shift(1)` prenait **la ligne précédente** de la route. Quand une route n'a pas volé pendant un ou
# plusieurs mois, cette ligne n'est pas le mois précédent. On mesure ici l'ampleur du problème.

# %%
df = df.sort_values(['Origin_airport', 'Destination_airport', 'Fly_date']).reset_index(drop=True)
df['route_id'] = df['Origin_airport'].astype(str) + '__' + df['Destination_airport'].astype(str)

DATE0 = df['Fly_date'].min()
df['m'] = ((df['Fly_date'].dt.year - DATE0.year) * 12 + (df['Fly_date'].dt.month - DATE0.month)).astype('int32')

ecart = df.groupby('route_id', sort=False)['m'].diff()
n_avec_precedent = int(ecart.notna().sum())
n_non_consecutif = int((ecart > 1).sum())
lag12_ligne = df.groupby('route_id', sort=False)['m'].shift(12)
n_lag12_faux = int(((df['m'] - lag12_ligne) != 12)[lag12_ligne.notna()].sum())
RESULTATS['diagnostic_lags_v8'] = {
    'observations_avec_ligne_precedente': n_avec_precedent,
    'lag1_non_consecutif': n_non_consecutif,
    'pct_lag1_non_consecutif': n_non_consecutif / n_avec_precedent * 100,
    'lag12_ne_correspond_pas_a_12_mois': n_lag12_faux,
    'pct_lag12_faux': n_lag12_faux / int(lag12_ligne.notna().sum()) * 100,
    'ecart_median_quand_non_consecutif': float(ecart[ecart > 1].median()) if n_non_consecutif else 0.0,
}
for k, v in RESULTATS['diagnostic_lags_v8'].items():
    print(f"{k:<40} : {v:,.2f}")
del ecart, lag12_ligne

# %% [markdown]
# ## 7. Représentation en panneau route × mois calendaire
#
# Chaque route devient une ligne d'une matrice dont les colonnes sont **tous les mois du calendrier**.
# Une case vide signifie que la route n'a pas été exploitée ce mois-là (0 passager, indicateur « absent »).
# Toutes les variables temporelles sont lues dans cette matrice, ce qui garantit que « t−k » est toujours
# le vrai mois t−k.

# %%
ROUTES = np.sort(df['route_id'].unique())
df['r'] = pd.Categorical(df['route_id'], categories=ROUTES).codes.astype('int32')
N_R = len(ROUTES)
N_M = int(df['m'].max()) + 1
PAD = 26                           # colonnes vides a gauche : retards jusqu'a 24 mois et fenetres de 24 mois
HORIZON_FUTUR = 3                   # mois prevus apres le dernier mois connu
W = PAD + N_M + HORIZON_FUTUR      # colonnes supplementaires pour les mois a prevoir
DATE_FIN = DATE0 + pd.DateOffset(months=N_M - 1)
MOIS0 = DATE0.month - 1            # mois de l'annee (0-11) de la premiere colonne


def colonne(m):
    return PAD + m


P_ACT = np.zeros((N_R, W), dtype='float64')     # passagers observes
F_ACT = np.zeros((N_R, W), dtype='float32')     # 1 = route exploitee ce mois-la
P_ACT[df['r'].values, colonne(df['m'].values)] = df['Passengers'].values
F_ACT[df['r'].values, colonne(df['m'].values)] = 1.0
C_SUM = np.cumsum(P_ACT, axis=1)                # sommes cumulees : moyennes historiques sans fuite
C_CNT = np.cumsum(F_ACT, axis=1)

premiere = df.groupby('r', sort=True).first()
AEROPORTS = pd.Index(np.union1d(premiere['Origin_airport'].astype(str), premiere['Destination_airport'].astype(str)))
O_IDX = AEROPORTS.get_indexer(premiere['Origin_airport'].astype(str)).astype('int32')
D_IDX = AEROPORTS.get_indexer(premiere['Destination_airport'].astype(str)).astype('int32')


def cumul_par_aeroport(idx):
    s = np.zeros((len(AEROPORTS), W)); c = np.zeros((len(AEROPORTS), W))
    np.add.at(s, idx, P_ACT)
    np.add.at(c, idx, F_ACT)
    return np.cumsum(s, axis=1), np.cumsum(c, axis=1)


A_SUM_O, A_CNT_O = cumul_par_aeroport(O_IDX)
A_SUM_D, A_CNT_D = cumul_par_aeroport(D_IDX)

DIST = premiere['Distance'].values.astype('float32')
OLAT, OLON = premiere['Org_airport_lat'].values.astype('float32'), premiere['Org_airport_long'].values.astype('float32')
DLAT, DLON = premiere['Dest_airport_lat'].values.astype('float32'), premiere['Dest_airport_long'].values.astype('float32')


def panneau_rempli(col):
    p = np.full((N_R, W), np.nan, dtype='float32')
    p[df['r'].values, colonne(df['m'].values)] = df[col].values
    return pd.DataFrame(p).ffill(axis=1).bfill(axis=1).to_numpy('float32')


POP_O = panneau_rempli('Origin_population')
POP_D = panneau_rempli('Destination_population')

print(f"Routes : {N_R:,} | mois : {N_M} | aeroports : {len(AEROPORTS)} | panneau : {N_R} x {W}")
print(f"Taux de remplissage du panneau : {F_ACT.sum() / (N_R * N_M) * 100:.1f} %")

# %% [markdown]
# ## 8. Variables explicatives calendaires et sans fuite (remarque 2)
#
# Pour prévoir le mois **m** avec l'information disponible jusqu'au mois **m − s** (s = 1 pour M+1) :
# - **retards** `lag_k` = trafic du mois calendaire m − k ; pour k < s ce mois est inconnu à l'origine de la
#   prévision et on utilise la prévision déjà faite (prévision récursive, identique pour tous les modèles) ;
# - **moyennes glissantes** sur 3 et 12 mois calendaires, nombre de mois exploités sur 12 mois, indicateurs « absent » ;
# - **moyennes historiques expansives** de la route, de l'aéroport d'origine et de l'aéroport de destination,
#   calculées sur les seuls mois ≤ m − s : elles remplacent le Target Encoding et `route_avg_passengers`,
#   qui utilisaient tout l'ensemble d'entraînement y compris la ligne prédite ;
# - variables statiques (distance, populations, potentiel de trafic, coordonnées) et mois de l'année (sin/cos).
#
# La transformation des variables d'historique suit celle de la cible (`brut` : passagers ; `log` : log(1 + passagers)).

# %%
TAB_COLS = ['lag_1', 'lag_2', 'lag_3', 'lag_12', 'lag_24',
            'roll_mean_3', 'roll_std_3', 'roll_mean_12', 'nb_actifs_12', 'absent_1', 'absent_12',
            'route_hist_mean', 'route_hist_n', 'origin_hist_mean', 'dest_hist_mean',
            'Distance', 'Origin_population', 'Destination_population', 'traffic_potential',
            'Org_airport_lat', 'Org_airport_long', 'Dest_airport_lat', 'Dest_airport_long',
            'Month_sin', 'Month_cos']
COL = {c: i for i, c in enumerate(TAB_COLS)}
K_MAX = 24


def transfo(mode):
    return np.log1p if mode == 'log' else (lambda x: x)


def valeurs_passees(r, m, s=1, preds=None):
    """Trafic des mois m-1 ... m-24 (colonne j = mois m-(j+1)) et indicateur d'exploitation.
    Pour k < s, le mois m-k n'est pas encore connu a l'origine de la prevision : on lit la prevision p_{s-k}."""
    cols = colonne(m)[:, None] - np.arange(1, K_MAX + 1)[None, :]
    vals = P_ACT[r[:, None], cols]
    pres = F_ACT[r[:, None], cols]
    for k in range(1, s):
        vals[:, k - 1] = preds[s - k][r, colonne(m) - k]
        pres[:, k - 1] = 1.0
    return vals, pres


def features_tab_depuis(vals, pres, r, m, s, mode):
    g = transfo(mode)
    gv = g(vals)
    X = np.empty((len(r), len(TAB_COLS)), dtype='float32')
    X[:, COL['lag_1']], X[:, COL['lag_2']], X[:, COL['lag_3']] = gv[:, 0], gv[:, 1], gv[:, 2]
    X[:, COL['lag_12']], X[:, COL['lag_24']] = gv[:, 11], gv[:, 23]
    X[:, COL['roll_mean_3']] = gv[:, :3].mean(axis=1)
    X[:, COL['roll_std_3']] = gv[:, :3].std(axis=1, ddof=1)
    X[:, COL['roll_mean_12']] = gv[:, :12].mean(axis=1)
    X[:, COL['nb_actifs_12']] = pres[:, :12].sum(axis=1)
    X[:, COL['absent_1']] = 1.0 - pres[:, 0]
    X[:, COL['absent_12']] = 1.0 - pres[:, 11]
    c = colonne(m) - s                                # information disponible jusqu'au mois m-s inclus
    n = C_CNT[r, c]
    X[:, COL['route_hist_mean']] = g(C_SUM[r, c] / np.maximum(n, 1))
    X[:, COL['route_hist_n']] = np.log1p(n)
    X[:, COL['origin_hist_mean']] = g(A_SUM_O[O_IDX[r], c] / np.maximum(A_CNT_O[O_IDX[r], c], 1))
    X[:, COL['dest_hist_mean']] = g(A_SUM_D[D_IDX[r], c] / np.maximum(A_CNT_D[D_IDX[r], c], 1))
    X[:, COL['Distance']] = DIST[r]
    po, pd_ = POP_O[r, colonne(m)], POP_D[r, colonne(m)]
    X[:, COL['Origin_population']], X[:, COL['Destination_population']] = po, pd_
    X[:, COL['traffic_potential']] = np.log1p(po.astype('float64') * pd_.astype('float64'))
    X[:, COL['Org_airport_lat']], X[:, COL['Org_airport_long']] = OLAT[r], OLON[r]
    X[:, COL['Dest_airport_lat']], X[:, COL['Dest_airport_long']] = DLAT[r], DLON[r]
    mois = (MOIS0 + m) % 12 + 1
    X[:, COL['Month_sin']] = np.sin(2 * np.pi * mois / 12)
    X[:, COL['Month_cos']] = np.cos(2 * np.pi * mois / 12)
    return X


def features_tab(r, m, s=1, preds=None, mode='brut'):
    vals, pres = valeurs_passees(r, m, s, preds)
    return features_tab_depuis(vals, pres, r, m, s, mode)


def par_blocs(fn, r, m, taille=100_000, **kw):
    return np.concatenate([fn(r[i:i + taille], m[i:i + taille], **kw) for i in range(0, len(r), taille)])

# %% [markdown]
# ## 9. Découpage chronologique par mois entiers (remarque 2)

# %%
obs = df[['r', 'm', 'Fly_date', 'Passengers']].copy()
del df
gc.collect()

ens_train = obs[obs['Fly_date'] <= FIN_TRAIN]
ens_val = obs[(obs['Fly_date'] >= DEBUT_VAL) & (obs['Fly_date'] <= FIN_VAL)]
ens_test = obs[obs['Fly_date'] >= DEBUT_TEST]
assert len(ens_train) + len(ens_val) + len(ens_test) == len(obs), "des mois ne sont dans aucun ensemble"
assert ens_train['Fly_date'].max() < ens_val['Fly_date'].min(), "un mois est partage entre train et validation"
assert ens_val['Fly_date'].max() < ens_test['Fly_date'].min(), "un mois est partage entre validation et test"

R_TR, M_TR, Y_TR = ens_train['r'].values, ens_train['m'].values, ens_train['Passengers'].values.astype('float64')
R_VA, M_VA, Y_VA = ens_val['r'].values, ens_val['m'].values, ens_val['Passengers'].values.astype('float64')
R_TE, M_TE, Y_TE = ens_test['r'].values, ens_test['m'].values, ens_test['Passengers'].values.astype('float64')
DATES_TE = ens_test['Fly_date'].values

RESULTATS['split'] = {}
for nom, e in [('train', ens_train), ('val', ens_val), ('test', ens_test)]:
    RESULTATS['split'][nom] = {'observations': int(len(e)), 'debut': str(e['Fly_date'].min().date()),
                               'fin': str(e['Fly_date'].max().date()), 'mois': int(e['Fly_date'].nunique()),
                               'routes': int(e['r'].nunique())}
    print(f"{nom:<6}: {len(e):>9,} obs. | {e['Fly_date'].min().date()} -> {e['Fly_date'].max().date()} "
          f"| {e['Fly_date'].nunique()} mois | {e['r'].nunique():,} routes")

# %% [markdown]


# %% [markdown]
# ## Export de production (v9) : réentraînement sur 1990-2009 et prévisions de janvier à mars 2010
#
# Le Random Forest (cible log), retenu sur la validation, et XGBoost (cible brute, pour comparaison) sont
# réentraînés avec les mêmes hyperparamètres sur toutes les observations disponibles, puis prévoient les trois
# mois qui suivent décembre 2009 par la même prévision récursive que dans le notebook. L'API ne fait ensuite
# qu'une lecture de ces prévisions (route_snapshot.parquet).

# %%
import time
from sklearn.ensemble import RandomForestRegressor
from xgboost import XGBRegressor

DOSSIER_APP = os.environ.get('V9_APP_MODEL', 'app/model')
R_ALL, M_ALL, Y_ALL = obs['r'].values, obs['m'].values, obs['Passengers'].values.astype('float64')
print(f"Observations d'entrainement (1990-2009) : {len(R_ALL):,}")

t0 = time.time()
X_LOG = par_blocs(features_tab, R_ALL, M_ALL, mode='log')
rf = RandomForestRegressor(n_estimators=100, max_depth=15, min_samples_leaf=10, max_features='sqrt',
                           n_jobs=-1, random_state=RANDOM_STATE)
rf.fit(X_LOG, np.log1p(Y_ALL))
del X_LOG
print(f"Random Forest entraine en {time.time() - t0:.0f} s")

# XGBoost : nombre d'arbres fixe par arret precoce (entrainement jusqu'a aout 2007, controle sur sept. 2007 - dec. 2009),
# puis reentrainement sur toutes les observations avec ce nombre d'arbres
t0 = time.time()
avant = (obs['Fly_date'] <= FIN_VAL).values
X_BRUT = par_blocs(features_tab, R_ALL, M_ALL, mode='brut')
xgb_es = XGBRegressor(n_estimators=1000, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8,
                      tree_method='hist', early_stopping_rounds=50, random_state=RANDOM_STATE)
xgb_es.fit(X_BRUT[avant], Y_ALL[avant], eval_set=[(X_BRUT[~avant], Y_ALL[~avant])], verbose=False)
N_ARBRES_XGB = int(xgb_es.best_iteration) + 1
xgb = XGBRegressor(n_estimators=N_ARBRES_XGB, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8,
                   tree_method='hist', random_state=RANDOM_STATE)
xgb.fit(X_BRUT, Y_ALL)
del X_BRUT
print(f"XGBoost : {N_ARBRES_XGB} arbres, entraine en {time.time() - t0:.0f} s")


def predire_rf(r, m, s, preds):
    X = par_blocs(features_tab, r, m, s=s, preds=preds, mode='log')
    return np.maximum(np.expm1(np.clip(rf.predict(X), None, 15)), 0)


def predire_xgb(r, m, s, preds):
    X = par_blocs(features_tab, r, m, s=s, preds=preds, mode='brut')
    return np.maximum(xgb.predict(X), 0)


def prevoir_apres_decembre_2009(predire, r):
    """Origine : decembre 2009 (dernier mois connu). Horizon s : mois N_M - 1 + s, les mois intermediaires etant
    remplaces par les previsions deja produites, comme dans l'evaluation du notebook."""
    preds, sortie = {}, {}
    for s in range(1, HORIZON_FUTUR + 1):
        m = np.full(len(r), N_M - 1 + s)
        p = predire(r, m, s, preds)
        panneau = np.full((N_R, W), np.nan)
        panneau[r, colonne(m)] = p
        preds[s], sortie[s] = panneau, p
    return sortie


# routes exploitees au dernier mois connu, avec au moins un passager
actives = np.where((F_ACT[:, colonne(N_M - 1)] == 1) & (P_ACT[:, colonne(N_M - 1)] > 0))[0].astype('int32')
print(f"Routes actives en {DATE_FIN.strftime('%Y-%m')} : {len(actives):,}")
prev = {'random_forest': prevoir_apres_decembre_2009(predire_rf, actives),
        'xgboost': prevoir_apres_decembre_2009(predire_xgb, actives)}

def mois_texte(m):
    return (DATE0 + pd.DateOffset(months=int(m))).strftime('%Y-%m')


# Snapshot : toutes les routes exploitees au dernier mois connu (les variables calendaires permettent de prevoir
# aussi les routes a historique court)
hist_cols = colonne(np.arange(N_M - 12, N_M))
snapshot = pd.DataFrame({
    'origin_airport': premiere['Origin_airport'].astype(str).values[actives],
    'destination_airport': premiere['Destination_airport'].astype(str).values[actives],
    'origin_city': premiere['Origin_city'].astype(str).values[actives],
    'destination_city': premiere['Destination_city'].astype(str).values[actives],
    'distance_miles': DIST[actives].astype('float64'),
    'dernier_mois_connu': mois_texte(N_M - 1),
    'derniers_passagers_connus': P_ACT[actives, colonne(N_M - 1)].astype('int64'),
    'historique_12m_valeurs': list(P_ACT[actives][:, hist_cols].astype('int64')),
    'historique_12m_mois': [np.array([mois_texte(m) for m in range(N_M - 12, N_M)])] * len(actives),
})
for s in range(1, HORIZON_FUTUR + 1):
    snapshot[f'mois_cible_h{s}'] = mois_texte(N_M - 1 + s)
    for nom, sortie in prev.items():
        snapshot[f'prediction_{nom}_h{s}'] = np.rint(sortie[s]).astype('int64')
assert not snapshot.duplicated(['origin_airport', 'destination_airport']).any()
assert (snapshot['derniers_passagers_connus'] > 0).all()
snapshot.to_parquet(f'{DOSSIER_APP}/route_snapshot.parquet', index=False)
with open(f'{DOSSIER_APP}/modeles_disponibles.json', 'w') as f:
    json.dump(['random_forest', 'xgboost'], f)
print(snapshot[(snapshot.origin_airport == 'ATL') & (snapshot.destination_airport == 'ORD')].T.to_string())
print(f"Ecrit : {DOSSIER_APP}/route_snapshot.parquet ({len(snapshot):,} routes)")
