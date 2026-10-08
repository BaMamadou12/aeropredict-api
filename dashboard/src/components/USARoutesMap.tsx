"use client";

import { useState, useEffect, useMemo, memo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  Line,
} from "react-simple-maps";
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

const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

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

interface AirportTooltipProps {
  airport: AirportData | null;
  position: { x: number; y: number } | null;
}

function AirportTooltipBox({ airport, position }: AirportTooltipProps) {
  if (!airport || !position) return null;

  return (
    <div
      className="absolute z-50 bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-600 rounded-xl p-4 shadow-xl pointer-events-none"
      style={{
        left: position.x + 10,
        top: position.y - 10,
        transform: "translateY(-100%)",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Plane className="w-4 h-4 text-sky-500" />
        <span className="font-bold text-slate-900 dark:text-white">{airport.code}</span>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-300">{airport.city}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{airport.name}</p>
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600">
        <p className="text-sm font-semibold text-sky-500">
          {airport.total_passengers.toLocaleString()} pass./mois
        </p>
        <p className="text-xs text-slate-400">{airport.routes_count} liaisons</p>
      </div>
    </div>
  );
}

const MapChart = memo(function MapChart({
  airports,
  routes,
  selectedHub,
  onSelectHub,
  onHoverAirport,
}: {
  airports: AirportData[];
  routes: TopRoute[];
  selectedHub: string | null;
  onSelectHub: (code: string | null) => void;
  onHoverAirport: (airport: AirportData | null, event: React.MouseEvent | null) => void;
}) {
  const maxPassengers = useMemo(() => {
    return Math.max(...airports.map((a) => a.total_passengers), 1);
  }, [airports]);

  const maxRoutePassengers = useMemo(() => {
    return routes[0]?.passengers || 1;
  }, [routes]);

  return (
    <ComposableMap
      projection="geoAlbersUsa"
      projectionConfig={{
        scale: 1000,
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Fond de carte des Etats US */}
      <Geographies geography={GEO_URL}>
        {({ geographies }) =>
          geographies.map((geo) => (
            <Geography
              key={geo.rsmKey}
              geography={geo}
              fill="#E2E8F0"
              stroke="#CBD5E1"
              strokeWidth={0.5}
              className="dark:fill-slate-700 dark:stroke-slate-600 outline-none hover:fill-slate-300 dark:hover:fill-slate-600 transition-colors"
            />
          ))
        }
      </Geographies>

      {/* Lignes des routes aeriennes */}
      {routes.map((route, idx) => {
        if (!route.origin_lat || !route.origin_lon || !route.dest_lat || !route.dest_lon) return null;

        const opacity = 0.3 + (route.passengers / maxRoutePassengers) * 0.5;
        const strokeWidth = 1 + (route.passengers / maxRoutePassengers) * 2;

        return (
          <Line
            key={`route-${route.origin}-${route.destination}-${idx}`}
            from={[route.origin_lon, route.origin_lat]}
            to={[route.dest_lon, route.dest_lat]}
            stroke="#8B5CF6"
            strokeWidth={strokeWidth}
            strokeOpacity={opacity}
            strokeLinecap="round"
          />
        );
      })}

      {/* Marqueurs des aeroports */}
      {airports
        .filter((a) => a.lat !== null && a.lon !== null)
        .map((airport) => {
          const size = 4 + (airport.total_passengers / maxPassengers) * 12;
          const isSelected = selectedHub === airport.code;

          return (
            <Marker
              key={airport.code}
              coordinates={[airport.lon!, airport.lat!]}
              onClick={() => onSelectHub(isSelected ? null : airport.code)}
              onMouseEnter={(e) => onHoverAirport(airport, e)}
              onMouseLeave={() => onHoverAirport(null, null)}
              style={{ cursor: "pointer" }}
            >
              <circle
                r={size}
                fill={isSelected ? "#F59E0B" : "#0EA5E9"}
                stroke={isSelected ? "#D97706" : "#0284C7"}
                strokeWidth={isSelected ? 3 : 2}
                className="transition-all duration-200"
              />
              {size > 8 && (
                <text
                  textAnchor="middle"
                  y={size + 12}
                  className="text-[10px] font-bold fill-slate-700 dark:fill-slate-300"
                >
                  {airport.code}
                </text>
              )}
            </Marker>
          );
        })}
    </ComposableMap>
  );
});

export function USARoutesMap() {
  const [airports, setAirports] = useState<AirportData[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [filteredRoutes, setFilteredRoutes] = useState<TopRoute[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [selectedHub, setSelectedHub] = useState<string | null>(null);
  const [hoveredAirport, setHoveredAirport] = useState<AirportData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
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

  const displayedRoutes = useMemo(() => {
    return topRoutes.slice(0, 5);
  }, [topRoutes]);

  const handleHoverAirport = (airport: AirportData | null, event: React.MouseEvent | null) => {
    setHoveredAirport(airport);
    if (event && airport) {
      const rect = (event.currentTarget as Element).closest(".map-container")?.getBoundingClientRect();
      if (rect) {
        setTooltipPos({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        });
      }
    } else {
      setTooltipPos(null);
    }
  };

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
                Carte TopoJSON US Census Bureau / Donnees BTS
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

      {/* KPI Cards */}
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
                Carte des Liaisons (react-simple-maps)
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

          <div className="map-container relative aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 dark:from-navy-900 dark:to-navy-800 rounded-xl overflow-hidden">
            <MapChart
              airports={airports}
              routes={filteredRoutes}
              selectedHub={selectedHub}
              onSelectHub={setSelectedHub}
              onHoverAirport={handleHoverAirport}
            />
            <AirportTooltipBox airport={hoveredAirport} position={tooltipPos} />
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
                <div className="w-8 h-0.5 bg-violet-500 rounded" />
                <span className="text-xs text-slate-600 dark:text-slate-400">Route aerienne</span>
              </div>
            </div>
            <p className="text-xs text-slate-400">
              Carte: US Census Bureau (TopoJSON)
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
              <strong className="text-slate-700 dark:text-slate-300">Sources:</strong> Trafic
              passagers du Bureau of Transportation Statistics (BTS). Coordonnees GPS de la FAA.
              Fond cartographique du US Census Bureau.
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
          <strong>Fond cartographique:</strong> US Census Bureau (TopoJSON via us-atlas)
        </p>
        <p>
          <strong>Donnees trafic:</strong> Bureau of Transportation Statistics (BTS) —{" "}
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
