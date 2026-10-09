"use client";

import { Moon, Sun, Wifi, Route, Cpu, Container, BarChart3, CalendarRange } from "lucide-react";
import { wapeHorizon, type HealthData, type ModelStats } from "@/lib/api";

const HORIZONS = ["M+1", "M+2", "M+3"];

interface SidebarProps {
  dark: boolean;
  onToggleTheme: () => void;
  health: HealthData;
  modelNames: Record<string, string>;
  modelStats: ModelStats | null;
}

export function Sidebar({ dark, onToggleTheme, health, modelNames, modelStats }: SidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-navy-800 border-r border-slate-200 dark:border-slate-700/50 flex flex-col z-50 overflow-y-auto">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/30">
            <span className="text-xl">✈️</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Trafic Aérien
            </h1>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
          Mémoire M2 IA & Smart Tech
          <br />
          Mamadou BA, UIDT
          <br />
          Encadreur : Pr. Cheikh SARR
        </p>
      </div>

      {/* Theme Toggle */}
      <div className="px-6 mb-4">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-navy-700 border border-slate-200 dark:border-slate-600 transition-colors"
        >
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {dark ? "Mode sombre" : "Mode clair"}
          </span>
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
            {dark ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-500" />
            )}
          </div>
        </button>
      </div>

      <div className="px-6">
        <div className="h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>

      {/* API Status */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
          <span className="text-sm font-medium text-emerald-500">API en ligne</span>
        </div>

        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-1">
            <Route className="w-4 h-4 text-slate-400" />
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Routes disponibles
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {health.routes_disponibles.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      {/* Models */}
      <div className="px-6 pb-4">
        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3">
          Modèles tabulaires
        </h3>
        <div className="space-y-2">
          {Object.entries(modelNames).map(([key, name]) => {
            const available = health.modeles_charges.includes(key);
            return (
              <div
                key={key}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                  available
                    ? "bg-emerald-500/10 border border-emerald-500/20"
                    : "bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      available ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  />
                  <span
                    className={
                      available
                        ? "text-emerald-600 dark:text-emerald-400 font-medium"
                        : "text-slate-400"
                    }
                  >
                    {name}
                  </span>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    available
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-slate-200 dark:bg-slate-700 text-slate-400"
                  }`}
                >
                  {available ? "Disponible" : "Indisponible"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6">
        <div className="h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>

      {/* Horizons */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-4 h-4 text-violet-400" />
          <h3 className="text-xs uppercase tracking-wider text-slate-400 font-medium">
            Fiabilité par horizon
          </h3>
        </div>
        <div className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-3">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400">
                <th className="text-left font-medium pb-1">Erreur (WAPE)</th>
                <th className="text-right font-medium pb-1">MLP</th>
                <th className="text-right font-medium pb-1">Mois préc.</th>
              </tr>
            </thead>
            <tbody>
              {HORIZONS.map((h) => {
                const mlp = modelStats ? wapeHorizon(modelStats, "MLP", h) : undefined;
                const naif = modelStats ? wapeHorizon(modelStats, "Persistance", h) : undefined;
                return (
                  <tr key={h}>
                    <td className="py-0.5 font-semibold text-slate-700 dark:text-slate-200">{h}</td>
                    <td className="py-0.5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {mlp !== undefined ? `${mlp.toFixed(1)} %` : "..."}
                    </td>
                    <td className="py-0.5 text-right text-slate-400">
                      {naif !== undefined ? `${naif.toFixed(1)} %` : "..."}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            Backtest sur le test 2007-2009. « Mois préc. » : reconduction du dernier mois connu.
          </p>
        </div>
      </div>

      <div className="px-6">
        <div className="h-px bg-slate-200 dark:bg-slate-700/50" />
      </div>

      {/* Architecture */}
      <div className="px-6 py-4 mt-auto">
        <h3 className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3">
          Architecture technique
        </h3>
        <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-3.5 h-3.5" /> Next.js (Frontend)
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5" /> FastAPI (Backend)
          </div>
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5" /> MLP · XGBoost
          </div>
          <div className="flex items-center gap-2">
            <Container className="w-3.5 h-3.5" /> Docker · Render
          </div>
        </div>
      </div>
    </aside>
  );
}
