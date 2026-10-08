"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Map, Plane, ArrowRight, TrendingUp, Users, Route, Navigation, Database, AlertCircle, Loader2 } from "lucide-react";
import {
  fetchAirports,
  fetchTopRoutes,
  fetchRoutesByAirport,
  fetchNetworkStats,
  type AirportData,
  type TopRoute,
  type NetworkStats,
} from "@/lib/api";

const US_BOUNDS = {
  minLon: -130,
  maxLon: -65,
  minLat: 22,
  maxLat: 50,
};

function lonToX(lon: number): number {
  return ((lon - US_BOUNDS.minLon) / (US_BOUNDS.maxLon - US_BOUNDS.minLon)) * 100;
}

function latToY(lat: number): number {
  return 100 - ((lat - US_BOUNDS.minLat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * 100;
}

interface KPICardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
  shadowColor: string;
}

function KPICard({ icon, title, value, subtitle, gradient, shadowColor }: KPICardProps) {
  return (
    <div className={`${gradient} rounded-2xl p-5 text-white card-hover shadow-lg ${shadowColor}`}>
      <div className="flex items-center gap-2 mb-2 opacity-85">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-2xl font-extrabold mb-1">{value}</p>
      <p className="text-xs opacity-70">{subtitle}</p>
    </div>
  );
}

interface RouteCardProps {
  route: TopRoute;
  rank: number;
}

function RouteCard({ route, rank }: RouteCardProps) {
  const bgColors = [
    "bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/30",
    "bg-gradient-to-r from-slate-300/20 to-slate-400/20 border-slate-400/30",
    "bg-gradient-to-r from-amber-700/20 to-amber-800/20 border-amber-700/30",
  ];
  const textColors = [
    "text-amber-500",
    "text-slate-400",
    "text-amber-700 dark:text-amber-600",
  ];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        rank < 3 ? bgColors[rank] : "bg-white/50 dark:bg-navy-700/30 border-slate-200 dark:border-slate-700"
      }`}
    >
      <span
        className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
          rank < 3 ? textColors[rank] : "text-slate-500 dark:text-slate-400"
        } bg-white dark:bg-navy-800`}
      >
        {rank + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm font-semibold text-slate-900 dark:text-white">
          <span>{route.origin}</span>
          <ArrowRight className="w-3 h-3 text-slate-400" />
          <span>{route.destination}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {route.origin_city.split(",")[0]} - {route.destination_city.split(",")[0]}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-sky-500">{route.passengers.toLocaleString()}</p>
        <p className="text-xs text-slate-400">pass./mois</p>
      </div>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function AirportTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="w-4 h-4 text-sky-500" />
        <span className="font-bold text-slate-900 dark:text-white">{data.code}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{data.city}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{data.name}</p>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
        <p className="text-sm font-semibold text-sky-500">
          {data.total_passengers.toLocaleString()} pass./mois
        </p>
        <p className="text-xs text-slate-400">
          {data.routes_count} liaisons
        </p>
      </div>
    </div>
  );
}

function USMapBackground() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      {/* Contour simplifie des Etats-Unis continentaux */}
      <path
        d="
          M 7,28 L 8,25 L 10,23 L 12,22 L 14,23 L 15,21 L 14,18 L 15,15 L 18,14 L 20,15
          L 22,14 L 24,15 L 26,14 L 28,15 L 30,14 L 32,15 L 34,14 L 36,15 L 38,13 L 40,14
          L 42,13 L 44,14 L 46,13 L 48,14 L 50,12 L 52,13 L 54,12 L 56,13 L 58,11 L 60,12
          L 62,11 L 64,12 L 66,11 L 68,13 L 70,12 L 72,14 L 74,13 L 76,15 L 78,14 L 80,16
          L 82,15 L 84,17 L 86,19 L 88,21 L 89,24 L 90,27 L 89,30 L 88,33 L 89,36 L 88,39
          L 87,42 L 86,45 L 85,48 L 84,51 L 83,54 L 82,57 L 80,59 L 78,61 L 76,62 L 74,64
          L 72,65 L 70,67 L 68,68 L 66,70 L 64,71 L 62,72 L 60,73 L 58,74 L 56,75 L 54,74
          L 52,75 L 50,74 L 48,75 L 46,74 L 44,75 L 42,73 L 40,74 L 38,72 L 36,73 L 34,71
          L 32,72 L 30,70 L 28,71 L 26,69 L 24,70 L 22,68 L 20,69 L 18,67 L 16,68 L 14,66
          L 12,67 L 10,65 L 8,64 L 7,61 L 6,58 L 5,55 L 6,52 L 5,49 L 6,46 L 5,43 L 6,40
          L 5,37 L 6,34 L 5,31 L 7,28
          Z
        "
        fill="url(#mapGradient)"
        stroke="currentColor"
        strokeWidth="0.3"
        strokeOpacity="0.2"
        className="text-sky-500 dark:text-sky-400"
      />
      {/* Floride */}
      <path
        d="M 76,62 L 78,65 L 80,68 L 81,72 L 80,76 L 78,78 L 75,77 L 74,74 L 75,70 L 74,67 L 74,64 L 76,62"
        fill="url(#mapGradient)"
        stroke="currentColor"
        strokeWidth="0.3"
        strokeOpacity="0.2"
        className="text-sky-500 dark:text-sky-400"
      />
      {/* Texas */}
      <path
        d="M 30,70 L 32,72 L 34,75 L 33,78 L 30,82 L 27,85 L 24,84 L 22,81 L 20,78 L 22,75 L 24,72 L 26,70 L 28,71 L 30,70"
        fill="url(#mapGradient)"
        stroke="currentColor"
        strokeWidth="0.3"
        strokeOpacity="0.2"
        className="text-sky-500 dark:text-sky-400"
      />
      {/* Grands Lacs (trous) */}
      <ellipse cx="68" cy="25" rx="3" ry="2" fill="#1e293b" fillOpacity="0.3" className="dark:fill-slate-900" />
      <ellipse cx="72" cy="28" rx="2" ry="1.5" fill="#1e293b" fillOpacity="0.3" className="dark:fill-slate-900" />
      <ellipse cx="65" cy="28" rx="2.5" ry="1.5" fill="#1e293b" fillOpacity="0.3" className="dark:fill-slate-900" />
    </svg>
  );
}

function RouteLines({ routes }: { routes: TopRoute[] }) {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0.6" />
        </linearGradient>
      </defs>
      {routes.map((route, idx) => {
        if (!route.origin_lat || !route.origin_lon || !route.dest_lat || !route.dest_lon) return null;

        const x1 = lonToX(route.origin_lon);
        const y1 = latToY(route.origin_lat);
        const x2 = lonToX(route.dest_lon);
        const y2 = latToY(route.dest_lat);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.08;

        const maxPassengers = routes[0]?.passengers || 1;
        const opacity = 0.3 + (route.passengers / maxPassengers) * 0.5;
        const strokeWidth = 0.15 + (route.passengers / maxPassengers) * 0.25;

        return (
          <path
            key={`${route.origin}-${route.destination}-${idx}`}
            d={`M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

export function USARoutesMap() {
  const [airports, setAirports] = useState<AirportData[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<TopRoute[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [airportsData, routesData, statsData] = await Promise.all([
          fetchAirports(1000, 30),
          fetchTopRoutes(30),
          fetchNetworkStats(),
        ]);
        setAirports(airportsData);
        setTopRoutes(routesData);
        setFilteredRoutes(routesData.slice(0, 15));
        setNetworkStats(statsData);
        setError(null);
      } catch (e: any) {
        setError(e.message || "Erreur de chargement des donnees");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    async function filterRoutes() {
      if (!selectedHub) {
        setFilteredRoutes(topRoutes.slice(0, 15));
        return;
      }
      try {
        const routes = await fetchRoutesByAirport(selectedHub, 15);
        setFilteredRoutes(routes);
      } catch {
        setFilteredRoutes([]);
      }
    }
    filterRoutes();
  }, [selectedHub, topRoutes]);

  const chartData = useMemo(() => {
    return airports
      .filter((a) => a.lat !== null && a.lon !== null)
      .map((airport) => ({
        ...airport,
        x: lonToX(airport.lon!),
        y: latToY(airport.lat!),
        z: airport.total_passengers,
      }));
  }, [airports]);

  const displayedRoutes = useMemo(() => {
    return topRoutes.slice(0, 5);
  }, [topRoutes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-sky-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Chargement des donnees BTS...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-red-400 mb-2">Erreur de chargement</h3>
        <p className="text-slate-400">{error}</p>
        <p className="text-sm text-slate-500 mt-2">Verifiez que l'API est accessible sur le port 8000</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header avec source des donnees */}
      <div className="bg-gradient-to-r from-sky-500/10 to-violet-500/10 dark:from-sky-500/20 dark:to-violet-500/20 border border-sky-500/20 dark:border-sky-500/30 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <Map className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Donnees Reelles BTS / Coordonnees FAA
              </p>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                Reseau Aerien Domestique US
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">Aeroports</p>
              <p className="text-lg font-bold text-sky-600 dark:text-sky-400">
                {networkStats?.airports_with_coordinates || 0}
              </p>
            </div>
            <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">Routes</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {networkStats?.total_routes.toLocaleString() || 0}
              </p>
            </div>
            <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">Pass./mois</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {networkStats ? (networkStats.total_passengers_monthly / 1000000).toFixed(1) + "M" : "..."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards - Donnees reelles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Users className="w-5 h-5" />}
          title="Trafic Mensuel Total"
          value={networkStats ? `${(networkStats.total_passengers_monthly / 1000000).toFixed(1)}M` : "..."}
          subtitle="Passagers (donnees BTS)"
          gradient="gradient-blue"
          shadowColor="shadow-sky-500/20"
        />
        <KPICard
          icon={<Database className="w-5 h-5" />}
          title="Routes dans le Dataset"
          value={networkStats?.total_routes.toLocaleString() || "..."}
          subtitle="Liaisons origine-destination"
          gradient="gradient-cyan"
          shadowColor="shadow-cyan-500/20"
        />
        <KPICard
          icon={<Route className="w-5 h-5" />}
          title="Distance Moyenne"
          value={networkStats ? `${Math.round(networkStats.average_distance_miles)} mi` : "..."}
          subtitle="Miles par liaison"
          gradient="gradient-green"
          shadowColor="shadow-emerald-500/20"
        />
        <KPICard
          icon={<Navigation className="w-5 h-5" />}
          title="Hub Principal"
          value={networkStats?.top_hub.code || "..."}
          subtitle={networkStats?.top_hub.city || "Chargement..."}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          shadowColor="shadow-violet-500/20"
        />
      </div>

      {/* Map and Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Plane className="w-5 h-5 text-sky-500" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Carte des Liaisons (Donnees Reelles)
              </h3>
            </div>
            {selectedHub && (
              <button
                onClick={() => setSelectedHub(null)}
                className="px-3 py-1 text-xs font-medium text-sky-500 bg-sky-500/10 hover:bg-sky-500/20 rounded-full transition"
              >
                Effacer filtre ({selectedHub})
              </button>
            )}
          </div>

          <div className="relative aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-navy-900 dark:to-navy-800 rounded-xl overflow-hidden">
            <USMapBackground />
            <RouteLines routes={filteredRoutes} />

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <XAxis type="number" dataKey="x" domain={[0, 100]} hide />
                <YAxis type="number" dataKey="y" domain={[0, 100]} hide />
                <ZAxis type="number" dataKey="z" range={[60, 400]} />
                <Tooltip content={<AirportTooltip />} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter
                  data={chartData}
                  onClick={(data: any) => {
                    if (data?.code) {
                      setSelectedHub(data.code === selectedHub ? null : data.code);
                    }
                  }}
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.code}
                      fill={selectedHub === entry.code ? "#F59E0B" : "#0EA5E9"}
                      stroke={selectedHub === entry.code ? "#D97706" : "#0284C7"}
                      strokeWidth={selectedHub === entry.code ? 3 : 2}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>

            {/* Airport Labels */}
            {chartData.slice(0, 15).map((airport) => (
              <div
                key={`label-${airport.code}`}
                className="absolute text-[9px] font-bold text-slate-700 dark:text-slate-300 pointer-events-none transform -translate-x-1/2"
                style={{
                  left: `${airport.x}%`,
                  top: `calc(${airport.y}% + 12px)`,
                }}
              >
                {airport.code}
              </div>
            ))}
          </div>

          {/* Legend and Source */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-sky-600" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Aeroport</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500 border-2 border-amber-600" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Selectionne</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gradient-to-r from-sky-500 via-violet-500 to-sky-500 rounded" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Route aerienne</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Source: {networkStats?.data_source || "BTS"}
            </p>
          </div>
        </div>

        {/* Top Routes Sidebar */}
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top 5 Liaisons (BTS)
            </h3>
          </div>

          <div className="space-y-3">
            {displayedRoutes.map((route, idx) => (
              <RouteCard key={`${route.origin}-${route.destination}`} route={route} rank={idx} />
            ))}
          </div>

          <div className="mt-4 p-3 bg-slate-100 dark:bg-navy-700/50 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">Donnees reelles:</strong> Ces
              statistiques proviennent du Bureau of Transportation Statistics (BTS). Les coordonnees
              GPS sont issues de la FAA.
            </p>
          </div>

          {networkStats?.top_route && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Route la plus frequentee
              </p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">
                {networkStats.top_route.origin} - {networkStats.top_route.destination}
              </p>
              <p className="text-sm text-slate-500">
                {networkStats.top_route.passengers.toLocaleString()} passagers/mois
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Data Attribution */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 space-y-1">
        <p>
          <strong>Source des donnees:</strong> Bureau of Transportation Statistics (BTS) —{" "}
          <a href="https://www.transtats.bts.gov" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
            transtats.bts.gov
          </a>
        </p>
        <p>
          <strong>Coordonnees GPS:</strong> Federal Aviation Administration (FAA)
        </p>
      </div>
    </div>
  );
}
