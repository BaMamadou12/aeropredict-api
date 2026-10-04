"use client";

import { MapPin, Ruler, Cpu, Calendar, Plane, CalendarRange } from "lucide-react";
import type { PredictionData } from "@/lib/api";

interface RouteInfoProps {
  prediction: PredictionData;
  modelName: string;
}

export function RouteInfo({ prediction, modelName }: RouteInfoProps) {
  const items = [
    {
      icon: <Plane className="w-4 h-4" />,
      label: "Route",
      value: `${prediction.origin_airport} → ${prediction.destination_airport}`,
    },
    {
      icon: <MapPin className="w-4 h-4" />,
      label: "Villes",
      value: `${prediction.origin_city} → ${prediction.destination_city}`,
    },
    {
      icon: <Ruler className="w-4 h-4" />,
      label: "Distance",
      value: `${prediction.distance_miles.toLocaleString("fr-FR")} miles`,
    },
    {
      icon: <Cpu className="w-4 h-4" />,
      label: "Modèle",
      value: modelName,
    },
    {
      icon: <CalendarRange className="w-4 h-4" />,
      label: "Horizon",
      value: `M+${prediction.horizon} (${prediction.horizon} mois)`,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Prévision",
      value: prediction.mois_cible,
    },
    {
      icon: <Calendar className="w-4 h-4" />,
      label: "Dernier mois",
      value: prediction.dernier_mois_connu,
    },
  ];

  return (
    <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 h-full">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-sky-500" />
        Informations sur la route
      </h3>

      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="text-slate-400 dark:text-slate-500 mt-0.5 shrink-0">
              {item.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
                {item.label}
              </p>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
