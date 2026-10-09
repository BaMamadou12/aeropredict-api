const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface HealthData {
  status: string;
  routes_disponibles: number;
  modeles_charges: string[];
  horizons_disponibles: number;
}

export interface Route {
  origin_airport: string;
  destination_airport: string;
  origin_city: string;
  destination_city: string;
}

export interface HorizonDetail {
  horizon: number;
  mois_cible: string;
  passagers_predits: number;
}

export interface PredictionData {
  origin_airport: string;
  destination_airport: string;
  origin_city: string;
  destination_city: string;
  distance_miles: number;
  modele_utilise: string;
  horizon: number;
  mois_cible: string;
  dernier_mois_connu: string;
  derniers_passagers_connus: number;
  passagers_predits: number;
  tous_horizons: HorizonDetail[];
  historique_12m_valeurs: number[];
  historique_12m_mois: string[];
}

export async function fetchHealth(): Promise<HealthData> {
  const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
  if (!res.ok) throw new Error("API inaccessible");
  return res.json();
}

export async function fetchRoutes(): Promise<Route[]> {
  const res = await fetch(`${API_URL}/routes`, { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les routes");
  return res.json();
}

export async function fetchPrediction(
  origin: string,
  destination: string,
  model: string,
  horizon: number = 1
): Promise<PredictionData> {
  const res = await fetch(`${API_URL}/predict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, model, horizon }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erreur inconnue" }));
    throw new Error(err.detail || `Erreur ${res.status}`);
  }
  return res.json();
}

// ======================================================================
// Endpoints Cartographie (données réelles BTS)
// ======================================================================

export interface AirportData {
  code: string;
  city: string;
  name: string;
  lat: number | null;
  lon: number | null;
  outbound_passengers: number;
  inbound_passengers: number;
  total_passengers: number;
  routes_count: number;
}

export interface TopRoute {
  origin: string;
  destination: string;
  origin_city: string;
  destination_city: string;
  passengers: number;
  distance_miles: number;
  origin_lat: number | null;
  origin_lon: number | null;
  dest_lat: number | null;
  dest_lon: number | null;
}

export interface NetworkStats {
  reference_month: string;
  total_routes: number;
  snapshot_routes: number;
  total_airports: number;
  airports_with_coordinates: number;
  total_passengers_monthly: number;
  average_distance_miles: number;
  top_hub: {
    code: string;
    city: string;
    passengers: number;
  };
  top_route: {
    origin: string;
    destination: string;
    passengers: number;
  } | null;
  data_source: string;
  coordinates_source: string;
}

export async function fetchAirports(minPassengers: number = 0, limit: number = 50): Promise<AirportData[]> {
  const res = await fetch(
    `${API_URL}/airports?min_passengers=${minPassengers}&limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Impossible de charger les aéroports");
  return res.json();
}

export async function fetchTopRoutes(limit: number = 20): Promise<TopRoute[]> {
  const res = await fetch(`${API_URL}/routes/top?limit=${limit}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les top routes");
  return res.json();
}

export async function fetchRoutesByAirport(code: string, limit: number = 20): Promise<TopRoute[]> {
  const res = await fetch(
    `${API_URL}/routes/by-airport/${code}?limit=${limit}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Impossible de charger les routes de ${code}`);
  return res.json();
}

export async function fetchNetworkStats(): Promise<NetworkStats> {
  const res = await fetch(`${API_URL}/stats/network`, { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les statistiques réseau");
  return res.json();
}

export interface DatasetStats {
  source: string;
  periode_debut: string;
  periode_fin: string;
  annee_reference: number;
  brut: { lignes: number; aeroports: number; routes: number };
  notebook: { observations_route_mois: number; routes_entrainement: number };
  snapshot: { routes: number; aeroports: number };
  passagers_annee_reference: number;
  annee_pic: number;
  passagers_annee_pic: number;
  trafic_annuel: { annee: number; passagers_millions: number }[];
  saisonnalite: { mois: string; label: string; passagers_millions: number }[];
  top_hubs: { hub: string; ville: string; passagers_millions: number }[];
  part_top20_hubs_pct: number;
  nb_aeroports_actifs_annee_reference: number;
}

export async function fetchDatasetStats(): Promise<DatasetStats> {
  const res = await fetch(`${API_URL}/stats/dataset`, { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les statistiques du dataset");
  return res.json();
}

export interface Metriques {
  RMSE: number;
  MAE: number;
  MAPE: number;
  WAPE: number;
  R2: number;
}

export interface ModelStats {
  genere_le: string;
  metriques_test: Record<string, Metriques>;
  backtest_multi_horizon: {
    n_observations: number;
    resultats: (Metriques & { Modele: string; Horizon: string })[];
  };
}

export async function fetchModelStats(): Promise<ModelStats> {
  const res = await fetch(`${API_URL}/stats/modele`, { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les performances du modele");
  return res.json();
}

export const CHAMPION = "MLP (tabulaire)";
export const PERSISTANCE = "Persistance y(t-1)";

/** Reduction d'erreur (WAPE) du champion par rapport a la persistance, en %. */
export function gainVsPersistance(stats: ModelStats): number {
  const m = stats.metriques_test;
  return (1 - m[CHAMPION].WAPE / m[PERSISTANCE].WAPE) * 100;
}

/** WAPE du backtest pour un modele et un horizon ("M+1", "M+2", "M+3"). */
export function wapeHorizon(stats: ModelStats, modele: string, horizon: string): number | undefined {
  return stats.backtest_multi_horizon.resultats.find((r) => r.Modele === modele && r.Horizon === horizon)?.WAPE;
}
