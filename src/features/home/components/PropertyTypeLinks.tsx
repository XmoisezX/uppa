import React from "react";
import Link from "next/link";
import {
  Building2,
  Home,
  ShieldCheck,
  TreePine,
  Layers,
  Briefcase,
  Maximize2,
  Landmark,
  ChevronRight,
} from "lucide-react";

interface PropertyTypeItem {
  label: string;
  sublabel: string;
  href: string;
  icon: React.ElementType;
}

const PROPERTY_TYPES: PropertyTypeItem[] = [
  {
    label: "Apartamentos",
    sublabel: "Residencial urbano",
    href: "/comprar?propertyType=apartment",
    icon: Building2,
  },
  {
    label: "Casas",
    sublabel: "Privacidade e espaço",
    href: "/comprar?propertyType=house",
    icon: Home,
  },
  {
    label: "Casas em Condomínio",
    sublabel: "Segurança e lazer",
    href: "/comprar?propertyType=condo_house",
    icon: ShieldCheck,
  },
  {
    label: "Terrenos e Lotes",
    sublabel: "Construa seu projeto",
    href: "/comprar?propertyType=land",
    icon: Landmark,
  },
  {
    label: "Studios e Kitnets",
    sublabel: "Praticidade e renda",
    href: "/comprar?propertyType=studio",
    icon: Maximize2,
  },
  {
    label: "Coberturas",
    sublabel: "Espaço e vista aberta",
    href: "/comprar?propertyType=penthouse",
    icon: Layers,
  },
  {
    label: "Salas e Comerciais",
    sublabel: "Negócios e consultórios",
    href: "/comprar?propertyType=commercial",
    icon: Briefcase,
  },
  {
    label: "Chácaras e Sítios",
    sublabel: "Lazer e tranquilidade",
    href: "/comprar?propertyType=farm",
    icon: TreePine,
  },
];

export function PropertyTypeLinks() {
  return (
    <section className="py-12 sm:py-14 bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Imóveis por Tipo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Explore imóveis à venda e locação conforme a sua necessidade
            </p>
          </div>
          <Link
            href="/comprar"
            className="hidden sm:flex items-center gap-1 text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Ver todos
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
          {PROPERTY_TYPES.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="group flex items-center gap-3.5 rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-indigo-400 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-400 transition-colors">
                  <Icon className="h-5 w-5 stroke-[1.8]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.label}
                  </h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                    {item.sublabel}
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
