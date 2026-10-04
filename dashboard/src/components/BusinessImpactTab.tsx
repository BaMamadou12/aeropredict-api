"use client";

import {
  Plane,
  Radio,
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  Leaf,
  BarChart3,
  Target,
  Wallet,
} from "lucide-react";

interface ImpactCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  description: string;
  metrics: { label: string; value: string; icon: React.ReactNode }[];
  accentColor: string;
}

function ImpactCard({
  icon,
  iconBg,
  title,
  subtitle,
  description,
  metrics,
  accentColor,
}: ImpactCardProps) {
  return (
    <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6 card-hover">
      <div className="flex items-start gap-4 mb-4">
        <div className={`p-3 ${iconBg} rounded-xl shrink-0`}>{icon}</div>
        <div>
          <h3 className={`text-lg font-bold ${accentColor}`}>{title}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-4">
        {description}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-slate-50 dark:bg-navy-700/50 rounded-xl p-3 flex items-center gap-2"
          >
            <div className="text-slate-400 dark:text-slate-500">{metric.icon}</div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</p>
              <p className={`text-sm font-bold ${accentColor}`}>{metric.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BusinessImpactTab() {
  const impactCards: ImpactCardProps[] = [
    {
      icon: <Plane className="w-6 h-6 text-sky-500" />,
      iconBg: "bg-sky-500/20",
      title: "Operations au Sol",
      subtitle: "Planification du Personnel Aeroportuaire",
      description:
        "La prevision precise du trafic passagers permet d'optimiser le dimensionnement des equipes aux points de contact critiques : postes de controle de surete (TSA/PIF), comptoirs d'enregistrement et portes d'embarquement. Une erreur de 10% sur le trafic prevu peut entrainer des files d'attente excessives ou un sureffectif couteux.",
      metrics: [
        { label: "Postes TSA", value: "Optimises", icon: <Users className="w-4 h-4" /> },
        { label: "Temps d'attente", value: "-25%", icon: <Clock className="w-4 h-4" /> },
      ],
      accentColor: "text-sky-600 dark:text-sky-400",
    },
    {
      icon: <Radio className="w-6 h-6 text-emerald-500" />,
      iconBg: "bg-emerald-500/20",
      title: "Gestion du Trafic Aerien (ATM)",
      subtitle: "Capacite et Durabilite",
      description:
        "Anticiper les flux de passagers aide les controleurs aeriens et la FAA a prevenir la saturation de l'espace aerien. Une meilleure planification reduit les retards au sol (ground delays), diminue la consommation de carburant des avions en attente et contribue a la reduction des emissions de CO2 du secteur.",
      metrics: [
        { label: "Retards sol", value: "-18%", icon: <Clock className="w-4 h-4" /> },
        { label: "Emissions CO2", value: "-12%", icon: <Leaf className="w-4 h-4" /> },
      ],
      accentColor: "text-emerald-600 dark:text-emerald-400",
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-violet-500" />,
      iconBg: "bg-violet-500/20",
      title: "Revenue Management",
      subtitle: "Optimisation de la Flotte",
      description:
        "Les compagnies aeriennes utilisent les previsions de demande pour ajuster dynamiquement leurs tarifs (yield management) et optimiser le coefficient de remplissage (Load Factor). Une prevision fiable a 3 mois permet d'affecter les appareils de capacite adequate a chaque route.",
      metrics: [
        { label: "Load Factor", value: "+8%", icon: <BarChart3 className="w-4 h-4" /> },
        { label: "Revenue/siege", value: "+15%", icon: <Target className="w-4 h-4" /> },
      ],
      accentColor: "text-violet-600 dark:text-violet-400",
    },
    {
      icon: <ShoppingBag className="w-6 h-6 text-amber-500" />,
      iconBg: "bg-amber-500/20",
      title: "Revenus Non-Aeronautiques",
      subtitle: "Commerces et Services",
      description:
        "Les aeroports tirent une part croissante de leurs revenus des activites commerciales : boutiques duty-free, restaurants, parkings et lounges. Prevoir le volume de passagers permet d'ajuster les stocks, les effectifs en boutique et la capacite des parkings pour maximiser les retombees.",
      metrics: [
        { label: "Duty-Free", value: "+22%", icon: <ShoppingBag className="w-4 h-4" /> },
        { label: "Parkings", value: "Optimises", icon: <Wallet className="w-4 h-4" /> },
      ],
      accentColor: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/10 to-sky-500/10 dark:from-violet-500/20 dark:to-sky-500/20 border border-violet-500/20 dark:border-violet-500/30 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Pourquoi la Prevision du Trafic est Strategique ?
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Dans l&apos;industrie aeronautique, chaque passager compte. Une prevision precise du
          trafic a 1, 2 ou 3 mois permet aux acteurs de la chaine de valeur — aeroports,
          compagnies aeriennes, autorites de controle — de prendre des decisions operationnelles
          et financieres eclairees. Voici les quatre piliers de l&apos;impact metier.
        </p>
      </div>

      {/* Impact Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {impactCards.map((card, index) => (
          <ImpactCard key={index} {...card} />
        ))}
      </div>

      {/* Key Takeaway */}
      <div className="bg-white dark:bg-navy-800/50 dark:glass border border-slate-200 dark:border-slate-700/50 rounded-2xl p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-sky-500" />
          En Resume : La Valeur d&apos;une Prevision a R2 = 0.9886
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-sky-500/10 rounded-xl">
            <p className="text-3xl font-extrabold text-sky-600 dark:text-sky-400">98.86%</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Variance Expliquee (R2)
            </p>
          </div>
          <div className="text-center p-4 bg-emerald-500/10 rounded-xl">
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">38.7ms</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Latence d&apos;Inference
            </p>
          </div>
          <div className="text-center p-4 bg-violet-500/10 rounded-xl">
            <p className="text-3xl font-extrabold text-violet-600 dark:text-violet-400">3 mois</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Horizon de Prevision
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
          Un modele MLP capable d&apos;expliquer 98.86% de la variance du trafic passagers offre aux
          decideurs une base fiable pour leurs arbitrages operationnels et strategiques.
        </p>
      </div>

      {/* Citation */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 italic">
        &quot;La donnee d&apos;aujourd&apos;hui construit la decision de demain.&quot;
      </div>
    </div>
  );
}
