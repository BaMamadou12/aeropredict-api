"use client";

import { BarChart3 } from "lucide-react";

interface ModelComparisonProps {
  comparisons: Record<string, number>;
  selectedModel: string;
  modelNames: Record<string, string>;
  horizon: number;
}

export function ModelComparison({
  comparisons,
  selectedModel,
  modelNames,
  horizon,
}: ModelComparisonProps) {
  const maxPred = Math.max(...Object.values(comparisons));
  const fmt = (n: number) => n.toLocaleString("fr-FR");

  return (
    <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-sky-500" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Comparaison des modèles sur cette route
          <span className="ml-2 text-sm font-normal text-slate-400 dark:text-slate-500">
            (horizon M+{horizon})
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(comparisons).map(([key, pred]) => {
          const isSelected = key === selectedModel;
          const barWidth = maxPred > 0 ? (pred / maxPred) * 100 : 0;

          return (
            <div
              key={key}
              className={`relative rounded-xl p-5 transition-all card-hover ${
                isSelected
                  ? "bg-sky-500/10 dark:bg-sky-500/15 border-2 border-sky-500/40"
                  : "bg-slate-50 dark:bg-navy-700/50 border border-slate-200 dark:border-slate-600/50"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`font-semibold ${
                    isSelected
                      ? "text-sky-600 dark:text-sky-400"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  {modelNames[key] || key}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500 text-white px-2 py-0.5 rounded-full">
                    Sélectionné
                  </span>
                )}
              </div>

              <p
                className={`text-2xl font-extrabold mb-3 ${
                  isSelected
                    ? "text-sky-600 dark:text-sky-400"
                    : "text-slate-900 dark:text-white"
                }`}
              >
                {fmt(pred)}
              </p>

              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                passagers prévus
              </p>

              {/* Bar */}
              <div className="h-1.5 bg-slate-200 dark:bg-slate-600/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isSelected ? "bg-sky-500" : "bg-slate-400 dark:bg-slate-500"
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
