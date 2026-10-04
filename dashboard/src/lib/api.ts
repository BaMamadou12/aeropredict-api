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
