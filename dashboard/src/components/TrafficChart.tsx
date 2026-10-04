"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { PredictionData } from "@/lib/api";

interface TrafficChartProps {
  prediction: PredictionData;
  modelName: string;
}

export function TrafficChart({ prediction, modelName }: TrafficChartProps) {
  const historicalData = prediction.historique_12m_mois.map((mois, i) => ({
    mois,
    historique: prediction.historique_12m_valeurs[i],
    prevision: null as number | null,
  }));

  // Bridge: last historical point connects to forecast line
  historicalData[historicalData.length - 1].prevision =
    prediction.historique_12m_valeurs[historicalData.length - 1];

  // Add all forecast horizons from tous_horizons
  for (const h of prediction.tous_horizons) {
    if (h.horizon <= prediction.horizon) {
      historicalData.push({
        mois: h.mois_cible,
        historique: null as any,
        prevision: h.passagers_predits,
      });
    }
  }

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-slate-600 rounded-xl p-3 shadow-xl">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
          {label}
        </p>
        {payload.map((p: any) => (
          <p
            key={p.dataKey}
            className="text-sm font-bold"
            style={{ color: p.color }}
          >
            {p.dataKey === "historique" ? "Historique" : "Prévision"} :{" "}
            {fmt(p.value)} passagers
          </p>
        ))}
      </div>
    );
  };

  const horizonLabel =
    prediction.horizon === 1
      ? "M+1"
      : prediction.horizon === 2
        ? "M+1 → M+2"
        : "M+1 → M+2 → M+3";

  return (
    <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-sky-500" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Évolution du trafic aérien
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-sky-500 rounded" />
            Historique
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-emerald-500 rounded border-dashed" />
            Prévision {horizonLabel} ({modelName})
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={historicalData}>
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
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={(v) => v.toLocaleString("fr-FR")}
            tick={{ fontSize: 11 }}
            stroke="currentColor"
            className="text-slate-400 dark:text-slate-500"
            width={70}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="historique"
            stroke="#0EA5E9"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#0EA5E9", strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="prevision"
            stroke="#10B981"
            strokeWidth={2.5}
            strokeDasharray="8 4"
            dot={{ r: 6, fill: "#10B981", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{ r: 8 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
