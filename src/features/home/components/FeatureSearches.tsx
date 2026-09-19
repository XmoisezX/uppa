import React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Armchair,
  RefreshCw,
  Bed,
  Car,
  BadgePercent,
  KeyRound,
  ArrowRight,
} from "lucide-react";

interface FeatureShortcut {
  title: string;
  subtitle: string;
  href: string;
  icon: React.ElementType;
}

const FEATURE_SHORTCUTS: FeatureShortcut[] = [
  {
    title: "Imóveis Financiáveis",
    subtitle: "Aprovados para financiamento bancário",
    href: "/comprar?financiable=true",
    icon: CheckCircle2,
  },
  {
    title: "Mobiliados",
    subtitle: "Prontos para morar imediatamente",
    href: "/comprar?furnished=true",
    icon: Armchair,
  },
  {
    title: "Aceita Permuta",
    subtitle: "Negocie seu imóvel atual na troca",
    href: "/comprar?acceptsExchange=true",
    icon: RefreshCw,
  },
  {
    title: "3 ou Mais Quartos",
    subtitle: "Mais espaço e conforto para a família",
    href: "/comprar?bedrooms=3",
    icon: Bed,
  },
  {
    title: "Com 2 ou Mais Vagas",
    subtitle: "Garagem espaçosa e segura",
    href: "/comprar?parkingSpaces=2",
    icon: Car,
  },
  {
    title: "Comprar até R$ 300 mil",
    subtitle: "Opções acessíveis de entrada",
    href: "/comprar?priceMax=300000",
    icon: BadgePercent,
  },
  {
    title: "Casas para Alugar",
    subtitle: "Locação de residências completas",
    href: "/alugar?propertyType=house",
    icon: KeyRound,
  },
  {
    title: "Aluguel até R$ 2.500/mês",
    subtitle: "Apartamentos e casas econômicos",
    href: "/alugar?priceMax=2500",
    icon: BadgePercent,
  },
];

export function FeatureSearches() {
  return (
    <section className="py-12 sm:py-14 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Buscas por Características
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Filtros populares para encontrar o perfil de imóvel ideal
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURE_SHORTCUTS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-indigo-400 hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500 dark:hover:bg-slate-900"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {item.subtitle}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
