"use client";

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
} from "lucide-react";

const SEASONALITY_DATA = [
  { mois: "Jan", passagers: 62.5, label: "Janvier" },
  { mois: "Fev", passagers: 58.2, label: "Fevrier" },
  { mois: "Mar", passagers: 68.9, label: "Mars" },
  { mois: "Avr", passagers: 67.3, label: "Avril" },
  { mois: "Mai", passagers: 71.8, label: "Mai" },
  { mois: "Jun", passagers: 74.6, label: "Juin" },
  { mois: "Jul", passagers: 82.1, label: "Juillet" },
  { mois: "Aou", passagers: 81.5, label: "Aout" },
  { mois: "Sep", passagers: 65.4, label: "Septembre" },
  { mois: "Oct", passagers: 66.8, label: "Octobre" },
  { mois: "Nov", passagers: 63.2, label: "Novembre" },
  { mois: "Dec", passagers: 69.7, label: "Decembre" },
];

const HUB_DATA = [
  { hub: "ATL", passagers: 93.7, ville: "Atlanta" },
  { hub: "DFW", passagers: 73.4, ville: "Dallas" },
  { hub: "DEN", passagers: 69.3, ville: "Denver" },
  { hub: "ORD", passagers: 68.3, ville: "Chicago" },
  { hub: "LAX", passagers: 65.9, ville: "Los Angeles" },
  { hub: "JFK", passagers: 52.1, ville: "New York" },
];

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
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const data = SEASONALITY_DATA.find((d) => d.mois === label);
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
          {payload[0].value.toFixed(1)}M passagers/an
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          title="Trafic Annuel Analyse"
          value="800M+"
          subtitle="Passagers / an (2018-2024)"
          gradient="gradient-blue"
          shadowColor="shadow-sky-500/20"
        />
        <StatCard
          icon={<MapPin className="w-5 h-5" />}
          title="Aeroports Cartographies"
          value="477"
          subtitle="Aeroports domestiques US"
          gradient="gradient-cyan"
          shadowColor="shadow-cyan-500/20"
        />
        <StatCard
          icon={<Route className="w-5 h-5" />}
          title="Liaisons Reseau"
          value="22 447"
          subtitle="Routes origine-destination"
          gradient="gradient-green"
          shadowColor="shadow-emerald-500/20"
        />
        <StatCard
          icon={<Database className="w-5 h-5" />}
          title="Dataset Entrainement"
          value="1.04M"
          subtitle="Observations mensuelles"
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
              Saisonnalite Mensuelle du Trafic
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={SEASONALITY_DATA}>
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
                domain={[55, 85]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="passagers"
                stroke="#0EA5E9"
                strokeWidth={2.5}
                fill="url(#colorPassagers)"
                dot={{ r: 4, fill: "#0EA5E9", strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            Pics en juillet-aout (vacances d&apos;ete) et creux en fevrier (basse saison)
          </p>
        </div>

        {/* Top Hubs Chart */}
        <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-violet-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Top 6 Hubs Americains
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={HUB_DATA} layout="vertical">
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
                dataKey="passagers"
                fill="#8B5CF6"
                radius={[0, 6, 6, 0]}
                barSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center">
            Atlanta (ATL) domine avec 93.7M passagers/an
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
              Concentration du Trafic : Hubs vs Routes Regionales
            </h4>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Le reseau aerien americain suit une distribution fortement asymetrique :
              <strong className="text-sky-600 dark:text-sky-400"> les 20 plus grands hubs</strong> concentrent
              plus de <strong className="text-sky-600 dark:text-sky-400">65% du trafic total</strong>,
              tandis que les 400+ aeroports regionaux se partagent le reste. Cette structure en
              &quot;hub-and-spoke&quot; cree des defis de prevision specifiques : les grands hubs
              presentent une forte inertie saisonniere, tandis que les lignes regionales sont
              plus volatiles et sensibles aux evenements locaux (meteo, evenements sportifs, conventions).
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="px-3 py-1 bg-sky-500/20 text-sky-600 dark:text-sky-400 rounded-full text-sm font-medium">
                Hub-and-Spoke
              </span>
              <span className="px-3 py-1 bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-sm font-medium">
                Longue Traine
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-medium">
                Saisonnalite
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Source Citation */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400">
        <p>
          Source : Bureau of Transportation Statistics (BTS) —
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
