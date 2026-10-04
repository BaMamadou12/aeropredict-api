"use client";

import { Plane, Calendar, TrendingUp, TrendingDown, CalendarRange } from "lucide-react";
import type { PredictionData } from "@/lib/api";

interface MetricCardsProps {
  prediction: PredictionData;
}

export function MetricCards({ prediction }: MetricCardsProps) {
  const variation =
    prediction.passagers_predits - prediction.derniers_passagers_connus;
  const pct =
    prediction.derniers_passagers_connus > 0
      ? (variation / prediction.derniers_passagers_connus) * 100
      : 0;
  const isUp = variation >= 0;

  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Trafic prévu */}
      <div className="gradient-blue rounded-2xl p-6 text-white card-hover shadow-lg shadow-sky-500/20">
        <div className="flex items-center gap-2 mb-3 opacity-85">
          <Plane className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wide">
            Trafic prévu
          </span>
        </div>
        <p className="text-3xl font-extrabold mb-1">
          {fmt(prediction.passagers_predits)}
        </p>
        <p className="text-sm opacity-70">
          passagers · {prediction.mois_cible}
        </p>
      </div>

      {/* Horizon */}
      <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 card-hover">
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-5 h-5 text-violet-500" />
          <span className="text-sm font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Horizon
          </span>
        </div>
        <p className="text-3xl font-extrabold text-violet-600 dark:text-violet-400 mb-1">
          M+{prediction.horizon}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {prediction.horizon === 1
            ? "1 mois"
            : `${prediction.horizon} mois`}{" "}
          après {prediction.dernier_mois_connu}
        </p>
      </div>

      {/* Dernier mois */}
      <div className="gradient-cyan rounded-2xl p-6 text-white card-hover shadow-lg shadow-cyan-500/20">
        <div className="flex items-center gap-2 mb-3 opacity-85">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-wide">
            Dernier mois observé
          </span>
        </div>
        <p className="text-3xl font-extrabold mb-1">
          {fmt(prediction.derniers_passagers_connus)}
        </p>
        <p className="text-sm opacity-70">
          passagers · {prediction.dernier_mois_connu}
        </p>
      </div>

      {/* Variation */}
      <div className="gradient-green rounded-2xl p-6 text-white card-hover shadow-lg shadow-emerald-500/20">
        <div className="flex items-center gap-2 mb-3 opacity-85">
          {isUp ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
          <span className="text-sm font-medium uppercase tracking-wide">
            Variation
          </span>
        </div>
        <p className="text-3xl font-extrabold mb-1">
          {isUp ? "+" : ""}
          {fmt(variation)}
        </p>
        <p className="text-sm opacity-70">
          {isUp ? "↑" : "↓"} {Math.abs(pct).toFixed(1)}% par rapport au
          dernier mois
        </p>
      </div>
    </div>
  );
}
