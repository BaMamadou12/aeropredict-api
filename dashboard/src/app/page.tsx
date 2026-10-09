"use client";

import { useEffect, useState, useCallback } from "react";
import {
  fetchHealth,
  fetchRoutes,
  fetchPrediction,
  fetchModelStats,
  gainVsPersistance,
  CHAMPION,
  type ModelStats,
  type HealthData,
  type Route,
  type PredictionData,
} from "@/lib/api";
import { Sidebar } from "@/components/Sidebar";
import { MetricCards } from "@/components/MetricCards";
import { TrafficChart } from "@/components/TrafficChart";
import { ModelComparison } from "@/components/ModelComparison";
import { RouteInfo } from "@/components/RouteInfo";
import { AviationStatsTab } from "@/components/AviationStatsTab";
import { BusinessImpactTab } from "@/components/BusinessImpactTab";
import { USARoutesMap } from "@/components/USARoutesMap";
import {
  Plane,
  Search,
  BarChart3,
  ArrowRightLeft,
  AlertCircle,
  CalendarRange,
  Rocket,
  PieChart,
  Lightbulb,
  Map,
} from "lucide-react";

const MODEL_NAMES: Record<string, string> = {
  mlp: "MLP (champion)",
  xgboost: "XGBoost",
};

const HORIZON_LABELS: Record<number, string> = {
  1: "1 mois (M+1)",
  2: "2 mois (M+2)",
  3: "3 mois (M+3)",
};

type TabType = "prediction" | "stats" | "map" | "impact";

interface TabButtonProps {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  activeTab: TabType;
  onClick: (tab: TabType) => void;
}

function TabButton({ id, label, icon, activeTab, onClick }: TabButtonProps) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-200 ${
        isActive
          ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30"
          : "bg-white dark:bg-navy-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-navy-700/50 border border-slate-200 dark:border-slate-700/50"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function Home() {
  const [dark, setDark] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("prediction");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [model, setModel] = useState("");
  const [modelStats, setModelStats] = useState<ModelStats | null>(null);
  const [horizon, setHorizon] = useState(1);
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [comparisons, setComparisons] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    Promise.all([fetchHealth(), fetchRoutes()])
      .then(([h, r]) => {
        setHealth(h);
        setRoutes(r);
        if (r.length > 0) {
          setOrigin(r[0].origin_airport);
        }
        if (h.modeles_charges.length > 0) {
          setModel(h.modeles_charges[0]);
        }
      })
      .catch(() => setApiError(true));
    fetchModelStats().then(setModelStats).catch(() => setModelStats(null));
  }, []);

  const origins = Array.from(new Set(routes.map((r) => r.origin_airport))).sort();
  const destinations = routes
    .filter((r) => r.origin_airport === origin)
    .map((r) => r.destination_airport)
    .sort();

  useEffect(() => {
    if (destinations.length > 0 && !destinations.includes(destination)) {
      setDestination(destinations[0]);
    }
  }, [origin, destinations, destination]);

  const getCityName = useCallback(
    (code: string, type: "origin" | "destination") => {
      const route = routes.find(
        type === "origin"
          ? (r) => r.origin_airport === code
          : (r) => r.destination_airport === code
      );
      return type === "origin"
        ? route?.origin_city || code
        : route?.destination_city || code;
    },
    [routes]
  );

  const handlePredict = async () => {
    if (!origin || !destination || !model) return;
    setLoading(true);
    setError("");
    setPrediction(null);
    setComparisons({});

    try {
      const pred = await fetchPrediction(origin, destination, model, horizon);
      setPrediction(pred);

      const models = health?.modeles_charges.filter((m) => m in MODEL_NAMES) || [];
      const compResults: Record<string, number> = {};
      await Promise.all(
        models.map(async (m) => {
          try {
            const p = await fetchPrediction(origin, destination, m, horizon);
            compResults[m] = p.passagers_predits;
          } catch {}
        })
      );
      setComparisons(compResults);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (apiError) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="text-center p-8 rounded-2xl bg-red-500/10 border border-red-500/20 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">API inaccessible</h2>
          <p className="text-slate-400">
            Impossible de joindre l&apos;API FastAPI. Vérifiez que le service tourne.
          </p>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="min-h-screen bg-navy-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-sky-400">
          <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-lg">Chargement...</span>
        </div>
      </div>
    );
  }

  const modelesDispo = health.modeles_charges.filter((m) => m in MODEL_NAMES);
  const maxHorizon = health.horizons_disponibles || 3;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-900 transition-colors duration-300">
      <div className="flex">
        {/* Sidebar */}
        <Sidebar
          dark={dark}
          onToggleTheme={() => setDark(!dark)}
          health={health}
          modelNames={MODEL_NAMES}
        />

        {/* Main */}
        <main className="flex-1 ml-72 p-8 min-h-screen">
          {/* Header */}
          <div className="mb-6">
            <p className="text-sky-500 dark:text-sky-400 text-sm font-semibold uppercase tracking-wider mb-1">
              Analyse prédictive du trafic passagers
            </p>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              Prévision du trafic aérien
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
              Des données d&apos;aujourd&apos;hui pour une meilleure mobilité demain.
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-3 mb-6">
            <TabButton
              id="prediction"
              label="Inférence & Prévision MLP"
              icon={<Rocket className="w-4 h-4" />}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
            <TabButton
              id="stats"
              label="Statistiques Réseau BTS"
              icon={<PieChart className="w-4 h-4" />}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
            <TabButton
              id="map"
              label="Carte des Routes US"
              icon={<Map className="w-4 h-4" />}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
            <TabButton
              id="impact"
              label="Valeur Métier & Opérations"
              icon={<Lightbulb className="w-4 h-4" />}
              activeTab={activeTab}
              onClick={setActiveTab}
            />
          </div>

          {/* Tab Content */}
          {activeTab === "prediction" && (
            <div className="space-y-6">
              {/* Model Champion Card */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-sky-500/10 dark:from-emerald-500/20 dark:to-sky-500/20 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        Modèle Champion
                      </p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        MLP (Multi-Layer Perceptron)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">R2 (test)</p>
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                        {modelStats ? modelStats.metriques_test[CHAMPION].R2.toFixed(4) : "..."}
                      </p>
                    </div>
                    <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Erreur WAPE (test)</p>
                      <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                        {modelStats ? `${modelStats.metriques_test[CHAMPION].WAPE.toFixed(1)} %` : "..."}
                      </p>
                    </div>
                    <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">vs persistance y(t-1)</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {modelStats ? `-${gainVsPersistance(modelStats).toFixed(0)} % d'erreur` : "..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Route Selection */}
              <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Search className="w-5 h-5 text-sky-500" />
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                    Sélection de la liaison
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      <Plane className="w-4 h-4 inline mr-1" />
                      Aéroport de départ
                    </label>
                    <select
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    >
                      {origins.map((o) => (
                        <option key={o} value={o}>
                          {o} ({getCityName(o, "origin")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      <ArrowRightLeft className="w-4 h-4 inline mr-1" />
                      Aéroport d&apos;arrivée
                    </label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    >
                      {destinations.map((d) => (
                        <option key={d} value={d}>
                          {d} ({getCityName(d, "destination")})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      <BarChart3 className="w-4 h-4 inline mr-1" />
                      Modèle de prévision
                    </label>
                    <select
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    >
                      {modelesDispo.map((m) => (
                        <option key={m} value={m}>
                          {MODEL_NAMES[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                      <CalendarRange className="w-4 h-4 inline mr-1" />
                      Horizon de prévision
                    </label>
                    <select
                      value={horizon}
                      onChange={(e) => setHorizon(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    >
                      {Array.from({ length: maxHorizon }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {HORIZON_LABELS[h] || `${h} mois (M+${h})`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handlePredict}
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Estimation en cours...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-5 h-5" />
                      Estimer le trafic
                    </>
                  )}
                </button>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {/* Results */}
              {prediction && (
                <div className="animate-fade-in space-y-6">
                  {/* Metrics */}
                  <MetricCards prediction={prediction} />

                  {/* Chart + Route Info */}
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                      <TrafficChart
                        prediction={prediction}
                        modelName={MODEL_NAMES[model]}
                      />
                    </div>
                    <div>
                      <RouteInfo
                        prediction={prediction}
                        modelName={MODEL_NAMES[model]}
                      />
                    </div>
                  </div>

                  {/* Model Comparison */}
                  {Object.keys(comparisons).length > 1 && (
                    <ModelComparison
                      comparisons={comparisons}
                      selectedModel={model}
                      modelNames={MODEL_NAMES}
                      horizon={horizon}
                    />
                  )}
                </div>
              )}

              {/* Info */}
              <div className="bg-sky-500/5 dark:bg-sky-500/10 border border-sky-500/15 dark:border-sky-500/20 rounded-xl p-5">
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  <strong className="text-sky-600 dark:text-sky-400">
                    À propos
                  </strong>{" "}
                  : seuls les modèles <strong>tabulaires</strong> (MLP, modèle champion,
                  et XGBoost) sont disponibles ici, car ils partagent le même vecteur
                  de features précalculé. Les architectures séquentielles (LSTM,
                  GRU, SimpleRNN) nécessitent la reconstruction d&apos;une séquence
                  de 6 mois et ne sont pas exposées. Leurs résultats figurent au
                  Chapitre 4 du mémoire.
                  L&apos;horizon de prévision (1 à 3 mois) utilise une approche
                  itérative : la prédiction de M+1 nourrit les features de M+2,
                  puis celle de M+2 nourrit M+3.
                </p>
              </div>
            </div>
          )}

          {activeTab === "stats" && <AviationStatsTab />}

          {activeTab === "map" && <USARoutesMap />}

          {activeTab === "impact" && <BusinessImpactTab />}

          {/* Footer */}
          <footer className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-700/50 text-center text-sm text-slate-400 dark:text-slate-500">
            <p className="font-semibold text-slate-600 dark:text-slate-300">
              Prévision du trafic aérien
            </p>
            <p>Master 2 IA & Smart Tech, UIDT</p>
            <p className="mt-1">
              Comprendre aujourd&apos;hui · Anticiper demain
            </p>
            <p className="mt-2 text-xs">
              Mamadou BA, sous la direction du Pr. Cheikh SARR ·{" "}
              <a
                href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`}
                target="_blank"
                className="text-sky-500 hover:underline"
              >
                Documentation API
              </a>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
