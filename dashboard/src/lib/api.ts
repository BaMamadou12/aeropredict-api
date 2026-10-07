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
// Endpoints Cartographie (données réelles BTS/FAA)
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
  total_routes: number;
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
