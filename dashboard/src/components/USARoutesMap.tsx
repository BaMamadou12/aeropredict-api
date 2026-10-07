"use client";

import { useState, useMemo } from "react";
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
import { Map, Plane, ArrowRight, TrendingUp, Users, Route, Navigation, Gauge } from "lucide-react";

interface Airport {
  code: string;
  city: string;
  lat: number;
  lon: number;
  passengers: number;
  isHub: boolean;
}

interface Route {
  origin: string;
  destination: string;
  passengers: number;
  distance: number;
}

const AIRPORTS: Airport[] = [
  { code: "ATL", city: "Atlanta", lat: 33.64, lon: -84.43, passengers: 93.7, isHub: true },
  { code: "DFW", city: "Dallas", lat: 32.90, lon: -97.04, passengers: 73.4, isHub: true },
  { code: "DEN", city: "Denver", lat: 39.86, lon: -104.67, passengers: 69.3, isHub: true },
  { code: "ORD", city: "Chicago", lat: 41.98, lon: -87.90, passengers: 68.3, isHub: true },
  { code: "LAX", city: "Los Angeles", lat: 33.94, lon: -118.41, passengers: 65.9, isHub: true },
  { code: "JFK", city: "New York", lat: 40.64, lon: -73.78, passengers: 52.1, isHub: true },
  { code: "SFO", city: "San Francisco", lat: 37.62, lon: -122.38, passengers: 45.2, isHub: true },
  { code: "SEA", city: "Seattle", lat: 47.45, lon: -122.31, passengers: 42.8, isHub: true },
  { code: "MIA", city: "Miami", lat: 25.79, lon: -80.29, passengers: 41.5, isHub: true },
  { code: "PHX", city: "Phoenix", lat: 33.43, lon: -112.01, passengers: 38.7, isHub: false },
  { code: "MSP", city: "Minneapolis", lat: 44.88, lon: -93.22, passengers: 32.4, isHub: false },
  { code: "DTW", city: "Detroit", lat: 42.21, lon: -83.35, passengers: 31.2, isHub: false },
  { code: "BOS", city: "Boston", lat: 42.36, lon: -71.01, passengers: 30.8, isHub: false },
  { code: "LAS", city: "Las Vegas", lat: 36.08, lon: -115.15, passengers: 29.5, isHub: false },
  { code: "MCO", city: "Orlando", lat: 28.43, lon: -81.31, passengers: 28.9, isHub: false },
  { code: "IAH", city: "Houston", lat: 29.98, lon: -95.34, passengers: 27.3, isHub: false },
];

const TOP_ROUTES: Route[] = [
  { origin: "LAX", destination: "JFK", passengers: 4.2, distance: 2475 },
  { origin: "LAX", destination: "SFO", passengers: 3.8, distance: 337 },
  { origin: "ATL", destination: "ORD", passengers: 3.5, distance: 606 },
  { origin: "LAX", destination: "ORD", passengers: 3.2, distance: 1745 },
  { origin: "JFK", destination: "MIA", passengers: 3.1, distance: 1090 },
  { origin: "ATL", destination: "DFW", passengers: 2.9, distance: 731 },
  { origin: "DEN", destination: "LAX", passengers: 2.8, distance: 862 },
  { origin: "ATL", destination: "MIA", passengers: 2.7, distance: 594 },
  { origin: "SFO", destination: "SEA", passengers: 2.5, distance: 679 },
  { origin: "ORD", destination: "DEN", passengers: 2.4, distance: 888 },
  { origin: "JFK", destination: "LAX", passengers: 4.2, distance: 2475 },
  { origin: "ATL", destination: "JFK", passengers: 2.3, distance: 760 },
  { origin: "DFW", destination: "LAX", passengers: 2.2, distance: 1235 },
  { origin: "ORD", destination: "JFK", passengers: 2.1, distance: 740 },
  { origin: "PHX", destination: "LAX", passengers: 2.0, distance: 370 },
];

const US_BOUNDS = {
  minLon: -125,
  maxLon: -66,
  minLat: 24,
  maxLat: 50,
};

function lonToX(lon: number): number {
  return ((lon - US_BOUNDS.minLon) / (US_BOUNDS.maxLon - US_BOUNDS.minLon)) * 100;
}

function latToY(lat: number): number {
  return 100 - ((lat - US_BOUNDS.minLat) / (US_BOUNDS.maxLat - US_BOUNDS.minLat)) * 100;
}

const US_OUTLINE_PATH = `
  M 15,25
  L 18,22 L 22,20 L 28,18 L 35,17 L 42,16 L 50,15
  L 58,14 L 65,15 L 72,17 L 78,20 L 82,24 L 85,28
  L 88,35 L 90,42 L 88,50 L 85,55 L 80,60 L 75,63
  L 70,68 L 65,72 L 58,75 L 50,77 L 42,78 L 35,76
  L 28,72 L 22,68 L 18,62 L 15,55 L 12,48 L 10,40
  L 11,32 L 15,25
  Z
`;

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

function AirportTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload as Airport;
  return (
    <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <Plane className="w-4 h-4 text-sky-500" />
        <span className="font-bold text-slate-900 dark:text-white">{data.code}</span>
        {data.isHub && (
          <span className="px-2 py-0.5 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-full text-xs font-medium">
            Hub
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{data.city}</p>
      <p className="text-sm font-semibold text-violet-500 mt-1">
        {data.passengers.toFixed(1)}M passagers/an
      </p>
    </div>
  );
}

function RouteLines({ routes, airports }: { routes: Route[]; airports: Airport[] }) {
  const getAirport = (code: string) => airports.find((a) => a.code === code);

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
        const origin = getAirport(route.origin);
        const dest = getAirport(route.destination);
        if (!origin || !dest) return null;

        const x1 = lonToX(origin.lon);
        const y1 = latToY(origin.lat);
        const x2 = lonToX(dest.lon);
        const y2 = latToY(dest.lat);

        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.08;

        const opacity = 0.3 + (route.passengers / 4.2) * 0.5;
        const strokeWidth = 0.15 + (route.passengers / 4.2) * 0.25;

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

function USOutline() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={US_OUTLINE_PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth="0.3"
        strokeOpacity="0.15"
        className="text-slate-400 dark:text-slate-600"
      />
    </svg>
  );
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
  route: Route;
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
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {route.distance.toLocaleString()} km
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-sky-500">{route.passengers}M</p>
        <p className="text-xs text-slate-400">pass./an</p>
      </div>
    </div>
  );
}

export function USARoutesMap() {
  const [selectedHub, setSelectedHub] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return AIRPORTS.map((airport) => ({
      ...airport,
      x: lonToX(airport.lon),
      y: latToY(airport.lat),
      z: airport.passengers,
    }));
  }, []);

  const filteredRoutes = useMemo(() => {
    if (!selectedHub) return TOP_ROUTES.slice(0, 10);
    return TOP_ROUTES.filter(
      (r) => r.origin === selectedHub || r.destination === selectedHub
    );
  }, [selectedHub]);

  const uniqueRoutes = useMemo(() => {
    const seen = new Set<string>();
    return TOP_ROUTES.filter((r) => {
      const key = [r.origin, r.destination].sort().join("-");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
  }, []);

  const kpiStats = useMemo(() => {
    const totalPassengers = AIRPORTS.reduce((sum, a) => sum + a.passengers, 0);
    const totalRoutePassengers = uniqueRoutes.reduce((sum, r) => sum + r.passengers, 0);
    const avgDistance = Math.round(
      TOP_ROUTES.reduce((sum, r) => sum + r.distance, 0) / TOP_ROUTES.length
    );
    const hubCount = AIRPORTS.filter((a) => a.isHub).length;
    return { totalPassengers, totalRoutePassengers, avgDistance, hubCount };
  }, [uniqueRoutes]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-500/10 to-violet-500/10 dark:from-sky-500/20 dark:to-violet-500/20 border border-sky-500/20 dark:border-sky-500/30 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 rounded-lg">
              <Map className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Visualisation Geographique
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
                {AIRPORTS.length}
              </p>
            </div>
            <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">Routes</p>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {uniqueRoutes.length * 2}+
              </p>
            </div>
            <div className="text-center px-4 py-2 bg-white/50 dark:bg-navy-800/50 rounded-xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">Hubs</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                {AIRPORTS.filter((a) => a.isHub).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={<Users className="w-5 h-5" />}
          title="Volume Total Hubs"
          value={`${kpiStats.totalPassengers.toFixed(0)}M`}
          subtitle="Passagers/an (16 aeroports)"
          gradient="gradient-blue"
          shadowColor="shadow-sky-500/20"
        />
        <KPICard
          icon={<Plane className="w-5 h-5" />}
          title="Hubs Majeurs"
          value={`${kpiStats.hubCount}`}
          subtitle="Aeroports principaux US"
          gradient="gradient-cyan"
          shadowColor="shadow-cyan-500/20"
        />
        <KPICard
          icon={<Route className="w-5 h-5" />}
          title="Distance Moyenne"
          value={`${kpiStats.avgDistance.toLocaleString()} km`}
          subtitle="Par liaison aerienne"
          gradient="gradient-green"
          shadowColor="shadow-emerald-500/20"
        />
        <KPICard
          icon={<Navigation className="w-5 h-5" />}
          title="Top 5 Routes"
          value={`${kpiStats.totalRoutePassengers.toFixed(1)}M`}
          subtitle="Passagers cumules/an"
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
                Carte des Liaisons
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
            <USOutline />
            <RouteLines routes={filteredRoutes} airports={AIRPORTS} />

            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[0, 100]}
                  hide
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0, 100]}
                  hide
                />
                <ZAxis
                  type="number"
                  dataKey="z"
                  range={[80, 400]}
                />
                <Tooltip
                  content={<AirportTooltip />}
                  cursor={{ strokeDasharray: "3 3" }}
                />
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
                      fill={
                        selectedHub === entry.code
                          ? "#F59E0B"
                          : entry.isHub
                          ? "#0EA5E9"
                          : "#8B5CF6"
                      }
                      stroke={
                        selectedHub === entry.code
                          ? "#D97706"
                          : entry.isHub
                          ? "#0284C7"
                          : "#7C3AED"
                      }
                      strokeWidth={selectedHub === entry.code ? 3 : 2}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>

            {/* Airport Labels */}
            {chartData.map((airport) => (
              <div
                key={`label-${airport.code}`}
                className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-300 pointer-events-none transform -translate-x-1/2"
                style={{
                  left: `${airport.x}%`,
                  top: `calc(${airport.y}% + 14px)`,
                }}
              >
                {airport.code}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-sky-500 border-2 border-sky-600" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Hub majeur</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500 border-2 border-violet-600" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Aeroport regional</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-gradient-to-r from-sky-500 via-violet-500 to-sky-500 rounded" />
              <span className="text-xs text-slate-600 dark:text-slate-400">Route aerienne</span>
            </div>
          </div>
        </div>

        {/* Top Routes Sidebar */}
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top 5 Liaisons
            </h3>
          </div>

          <div className="space-y-3">
            {uniqueRoutes.map((route, idx) => (
              <RouteCard key={`${route.origin}-${route.destination}`} route={route} rank={idx} />
            ))}
          </div>

          <div className="mt-4 p-3 bg-slate-100 dark:bg-navy-700/50 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-700 dark:text-slate-300">Tip :</strong> Cliquez sur un
              aeroport pour filtrer les routes le concernant. Les tailles des points representent
              le volume de passagers.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-sky-500">LAX-JFK</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Route la plus frequentee</p>
        </div>
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-violet-500">4.2M</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Passagers/an (LAX-JFK)</p>
        </div>
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-500">337 km</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Route la plus courte (LAX-SFO)</p>
        </div>
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-amber-500">2 475 km</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Route la plus longue (LAX-JFK)</p>
        </div>
      </div>
    </div>
  );
}
