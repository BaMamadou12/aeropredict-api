"use client";

import { useEffect, useState } from "react";
import {
  Plane,
  Radio,
  TrendingUp,
  ShoppingBag,
  Users,
  Clock,
  BarChart3,
  ExternalLink,
  Target,
  Wallet,
} from "lucide-react";
import {
  fetchModelStats,
  fetchDatasetStats,
  gainVsPersistance,
  wapeHorizon,
  CHAMPION,
  type ModelStats,
  type DatasetStats,
} from "@/lib/api";

interface Source {
  label: string;
  url: string;
}

// Sources officielles des chiffres affiches dans les cartes (verifiees en octobre 2026)
const SOURCES: Record<string, Source> = {
  tsaRecord: {
    label: "TSA, communiqué du 11 juillet 2024",
    url: "https://www.tsa.gov/news/press/releases/2024/07/11/tsa-discusses-summer-travel-and-security-technologies-use-hnl",
  },
  tsaStandard: {
    label: "TSA, communiqué du 24 juin 2024 (standards d'attente)",
    url: "https://www.tsa.gov/news/press/releases/2024/06/24/tsa-breaks-record-most-individuals-screened-single-day-readies",
  },
  nextor: {
    label: "FAA / NEXTOR, Total Delay Impact Study (2010, données 2007)",
    url: "https://rosap.ntl.bts.gov/view/dot/6234",
  },
  loadFactor: {
    label: "BTS, load factor domestique mensuel (série FRED LOADFACTORD11)",
    url: "https://fred.stlouisfed.org/series/LOADFACTORD11",
  },
  cats: {
    label: "FAA CATS Report 127 (FY2023) et ACI Airport Economics Survey 2025, via ACI-NA",
    url: "https://airportscouncil.org/wp-content/uploads/2025/07/20250619-ACI-NA-Concession-Survey_BM-Success.pdf",
  },
};

interface ImpactCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  description: string;
  metrics: { label: string; value: string; icon: React.ReactNode }[];
  accentColor: string;
  sources: Source[];
}

function ImpactCard({
  icon,
  iconBg,
  title,
  subtitle,
  description,
  metrics,
  accentColor,
  sources,
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
      <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
        Source :{" "}
        {sources.map((src, i) => (
          <span key={src.url}>
            {i > 0 && " ; "}
            <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
              {src.label}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}

export function BusinessImpactTab() {
  const [stats, setStats] = useState<ModelStats | null>(null);
  const [dataset, setDataset] = useState<DatasetStats | null>(null);

  useEffect(() => {
    fetchModelStats().then(setStats).catch(() => setStats(null));
    fetchDatasetStats().then(setDataset).catch(() => setDataset(null));
  }, []);

  const saison = dataset?.saisonnalite ?? [];
  const pic = saison.length ? saison.reduce((a, b) => (b.passagers_millions > a.passagers_millions ? b : a)) : null;
  const creux = saison.length ? saison.reduce((a, b) => (b.passagers_millions < a.passagers_millions ? b : a)) : null;

  const champion = stats?.metriques_test[CHAMPION];
  const wapeM3 = stats ? wapeHorizon(stats, "MLP", "M+3") : undefined;
  const impactCards: ImpactCardProps[] = [
    {
      icon: <Plane className="w-6 h-6 text-sky-500" />,
      iconBg: "bg-sky-500/20",
      title: "Opérations au Sol",
      subtitle: "Planification du Personnel Aéroportuaire",
      description:
        "La TSA dimensionne ses équipes pour tenir des standards d'attente fixes, alors que les volumes atteignent des records. Prévoir le trafic d'une route à 1-3 mois permet d'anticiper les besoins en agents de sûreté, comptoirs d'enregistrement et portes d'embarquement.",
      metrics: [
        { label: "Record TSA (7 juillet 2024)", value: "3 013 413 pax/jour", icon: <Users className="w-4 h-4" /> },
        { label: "Standard d'attente TSA", value: "≤ 30 min (≤ 10 PreCheck)", icon: <Clock className="w-4 h-4" /> },
      ],
      accentColor: "text-sky-600 dark:text-sky-400",
      sources: [SOURCES.tsaRecord, SOURCES.tsaStandard],
    },
    {
      icon: <Radio className="w-6 h-6 text-emerald-500" />,
      iconBg: "bg-emerald-500/20",
      title: "Gestion du Trafic Aérien (ATM)",
      subtitle: "Capacité et Retards",
      description:
        "L'étude de référence commandée par la FAA chiffre le coût annuel des retards aériens aux États-Unis. Anticiper la demande aide à ajuster les programmes de vols et la capacité du système pour limiter la saturation et ses coûts.",
      metrics: [
        { label: "Coût total des retards (2007)", value: "32,9 Md$/an", icon: <Clock className="w-4 h-4" /> },
        { label: "Dont supporté par les passagers", value: "16,7 Md$", icon: <Users className="w-4 h-4" /> },
      ],
      accentColor: "text-emerald-600 dark:text-emerald-400",
      sources: [SOURCES.nextor],
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-violet-500" />,
      iconBg: "bg-violet-500/20",
      title: "Revenue Management",
      subtitle: "Capacité et Saisonnalité",
      description:
        "Avec des avions déjà remplis à environ 80 %, la marge d'optimisation se joue sur l'affectation de la bonne capacité au bon mois. La forte saisonnalité observée dans le dataset montre pourquoi une prévision mois par mois est nécessaire.",
      metrics: [
        { label: "Load factor domestique 2009 (mensuel, CVS)", value: "78,0 % à 82,6 %", icon: <BarChart3 className="w-4 h-4" /> },
        {
          label: `Écart saisonnier ${dataset?.annee_reference ?? ""} (dataset)`,
          value: pic && creux ? `${creux.passagers_millions} M → ${pic.passagers_millions} M pax` : "...",
          icon: <Target className="w-4 h-4" />,
        },
      ],
      accentColor: "text-violet-600 dark:text-violet-400",
      sources: [SOURCES.loadFactor, { label: "Airports2.csv (BTS), calcul du projet", url: "https://www.transtats.bts.gov" }],
    },
    {
      icon: <ShoppingBag className="w-6 h-6 text-amber-500" />,
      iconBg: "bg-amber-500/20",
      title: "Revenus Non-Aéronautiques",
      subtitle: "Commerces, Parkings et Services",
      description:
        "Près de la moitié des revenus des aéroports américains ne vient pas des compagnies aériennes mais des passagers eux-mêmes, d'abord via les parkings. Prévoir le volume de passagers permet de dimensionner parkings, commerces et effectifs.",
      metrics: [
        { label: "Part non-aéro, aéroports US (FY2023)", value: "46 % (13,2 Md$)", icon: <Wallet className="w-4 h-4" /> },
        { label: "Parkings dans le non-aéro (Am. du Nord)", value: "43 %", icon: <ShoppingBag className="w-4 h-4" /> },
      ],
      accentColor: "text-amber-600 dark:text-amber-400",
      sources: [SOURCES.cats],
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-500/10 to-sky-500/10 dark:from-violet-500/20 dark:to-sky-500/20 border border-violet-500/20 dark:border-violet-500/30 rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Pourquoi la Prévision du Trafic est Stratégique ?
        </h2>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Dans l&apos;industrie aéronautique, chaque passager compte. Une prévision précise du
          trafic à 1, 2 ou 3 mois permet aux acteurs de la chaîne de valeur (aéroports,
          compagnies aériennes, autorités de contrôle) de prendre des décisions opérationnelles
          et financières éclairées. Les chiffres ci-dessous proviennent de sources officielles
          (TSA, FAA, BTS, ACI) : ils décrivent les enjeux du secteur, et non des gains mesurés par ce modèle.
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
          En Résumé : La Valeur de la Prévision MLP (test 2007-2009)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-sky-500/10 rounded-xl">
            <p className="text-3xl font-extrabold text-sky-600 dark:text-sky-400">
              {champion ? `${champion.WAPE.toFixed(1)} %` : "..."}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Erreur sur le trafic total (WAPE, M+1)
            </p>
          </div>
          <div className="text-center p-4 bg-emerald-500/10 rounded-xl">
            <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {stats ? `-${gainVsPersistance(stats).toFixed(0)} %` : "..."}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              d&apos;erreur vs reconduction du mois précédent
            </p>
          </div>
          <div className="text-center p-4 bg-violet-500/10 rounded-xl">
            <p className="text-3xl font-extrabold text-violet-600 dark:text-violet-400">3 mois</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Horizon de prévision{wapeM3 !== undefined && ` (WAPE M+3 : ${wapeM3.toFixed(1)} %)`}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 text-center">
          Le MLP explique {champion ? `${(champion.R2 * 100).toFixed(2)} %` : "..."} de la variance du trafic
          et réduit l&apos;erreur par rapport à la simple reconduction du mois précédent. Sa précision
          relative reste faible sur les petites lignes régionales (MAPE élevée) : les volumes des grands
          flux sont fiables, ceux des petites lignes sont à interpréter avec prudence.
        </p>
      </div>

      {/* Citation */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 italic">
        &quot;La donnée d&apos;aujourd&apos;hui construit la décision de demain.&quot;
      </div>
    </div>
  );
}
