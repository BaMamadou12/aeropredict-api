"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Users,
  MapPin,
  Route,
  Database,
  TrendingUp,
  Building2,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { fetchDatasetStats, type DatasetStats } from "@/lib/api";

const fmt = (n: number) => n.toLocaleString("fr-FR");

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  gradient: string;
  shadowColor: string;
}

function StatCard({ icon, title, value, subtitle, gradient, shadowColor }: StatCardProps) {
  return (
    <div className={`${gradient} rounded-2xl p-6 text-white card-hover shadow-lg ${shadowColor}`}>
      <div className="flex items-center gap-2 mb-3 opacity-85">
        {icon}
        <span className="text-sm font-medium uppercase tracking-wide">{title}</span>
      </div>
      <p className="text-3xl font-extrabold mb-1">{value}</p>
      <p className="text-sm opacity-70">{subtitle}</p>
    </div>
  );
}

export function AviationStatsTab() {
  const [stats, setStats] = useState<DatasetStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDatasetStats()
      .then(setStats)
      .catch((e) => setError(e.message || "Erreur de chargement"));
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = stats?.saisonnalite.find((d) => d.mois === label);
    return (
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 shadow-xl">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {data?.label || label}
        </p>
        <p className="text-sm font-bold text-sky-500">
          {payload[0].value.toFixed(1)}M passagers
        </p>
      </div>
    );
  };

  const HubTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 shadow-xl">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {payload[0].payload.ville} ({payload[0].payload.hub})
        </p>
        <p className="text-sm font-bold text-violet-500">
          {payload[0].value.toFixed(1)}M passagers en {stats?.annee_reference}
        </p>
      </div>
    );
  };

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-slate-400">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-96 gap-3 text-sky-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Chargement des statistiques BTS...</span>
      </div>
    );
  }

  const saison = stats.saisonnalite;
  const pic = saison.reduce((a, b) => (b.passagers_millions > a.passagers_millions ? b : a));
  const creux = saison.reduce((a, b) => (b.passagers_millions < a.passagers_millions ? b : a));
  const hub1 = stats.top_hubs[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          title={`Trafic Annuel ${stats.annee_reference}`}
          value={`${Math.round(stats.passagers_annee_reference / 1e6)}M`}
          subtitle={`Passagers (pic : ${Math.round(stats.passagers_annee_pic / 1e6)}M en ${stats.annee_pic})`}
          gradient="gradient-blue"
          shadowColor="shadow-sky-500/20"
        />
        <StatCard
          icon={<MapPin className="w-5 h-5" />}
          title="Aéroports Cartographiés"
          value={fmt(stats.snapshot.aeroports)}
          subtitle={`Sur ${fmt(stats.brut.aeroports)} dans le dataset brut`}
          gradient="gradient-cyan"
          shadowColor="shadow-cyan-500/20"
        />
        <StatCard
          icon={<Route className="w-5 h-5" />}
          title="Liaisons Prévues"
          value={fmt(stats.snapshot.routes)}
          subtitle={`Routes servies par l'API (${fmt(stats.notebook.routes_entrainement)} en entraînement)`}
          gradient="gradient-green"
          shadowColor="shadow-emerald-500/20"
        />
        <StatCard
          icon={<Database className="w-5 h-5" />}
          title="Dataset Entraînement"
          value={`${(stats.notebook.observations_route_mois / 1e6).toFixed(2)}M`}
          subtitle="Observations route x mois (après nettoyage)"
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          shadowColor="shadow-violet-500/20"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seasonality Chart */}
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-sky-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Saisonnalité Mensuelle du Trafic ({stats.annee_reference})
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={saison}>
              <defs>
                <linearGradient id="colorPassagers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
              />
              <XAxis
                dataKey="mois"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                tickFormatter={(v) => `${v}M`}
                domain={["dataMin - 3", "dataMax + 3"]}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="passagers_millions"
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fill="url(#colorPassagers)"
                dot={{ r: 4, fill: "#0EA5E9", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            Pic en {pic.label.toLowerCase()} ({pic.passagers_millions}M) et creux en{" "}
            {creux.label.toLowerCase()} ({creux.passagers_millions}M)
          </p>
        </div>

        {/* Top Hubs Chart */}
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top 6 Hubs du Dataset ({stats.annee_reference})
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.top_hubs} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-700"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                tickFormatter={(v) => `${v}M`}
              />
              <YAxis
                type="category"
                dataKey="hub"
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-slate-400 dark:text-slate-500"
                width={40}
              />
              <Tooltip content={<HubTooltip />} />
              <Bar
                dataKey="passagers_millions"
                fill="#8B5CF6"
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            {hub1.ville} ({hub1.hub}) domine avec {hub1.passagers_millions}M passagers (departs +
            arrivees) en {stats.annee_reference}
          </p>
        </div>
      </div>

      {/* Analytical Insight Box */}
      <div className="bg-gradient-to-r from-sky-500/10 to-violet-500/10 dark:from-sky-500/20 dark:to-violet-500/20 border border-sky-500/20 dark:border-sky-500/30 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sky-500/20 rounded-xl">
            <Info className="w-6 h-6 text-sky-500" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Concentration du Trafic : Hubs vs Routes Régionales
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Le réseau aérien américain suit une distribution fortement asymétrique :
              <strong className="text-sky-600 dark:text-sky-400"> les 20 plus grands hubs</strong> concentrent{" "}
              <strong className="text-sky-600 dark:text-sky-400">{stats.part_top20_hubs_pct}% du trafic</strong>{" "}
              en {stats.annee_reference}, tandis que les{" "}
              {stats.nb_aeroports_actifs_annee_reference - 20} autres aéroports actifs se partagent le reste. Cette structure en
              &quot;hub-and-spoke&quot; crée des défis de prévision spécifiques : les grands hubs
              présentent une forte inertie saisonnière, tandis que les lignes régionales sont
              plus volatiles et sensibles aux événements locaux (météo, événements sportifs, conventions).
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="px-3 py-1 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-full text-sm font-medium">
                Hub-and-Spoke
              </span>
              <span className="px-3 py-1 bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-sm font-medium">
                Longue Traîne
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                Saisonnalité
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Source Citation */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        <p>
          Source : Bureau of Transportation Statistics (BTS), dataset Airports2.csv ({stats.periode_debut} à{" "}
          {stats.periode_fin}),
          <a
            href="https://www.transtats.bts.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-500 hover:underline ml-1"
          >
            transtats.bts.gov
          </a>
        </p>
      </div>
    </div>
  );
}
