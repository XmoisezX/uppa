import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PropertyCard } from "@/components/property/PropertyCard";
import type { SearchPropertyItem } from "@/features/search/types";

interface SimilarPropertiesProps {
  properties: SearchPropertyItem[];
  transactionType?: string;
}

/**
 * Seção de imóveis semelhantes — exibida no final da página do imóvel.
 * Cumpre MASTER_PLAN seção 14, item 14.
 *
 * - Colapsa completamente (retorna null) quando não há similares.
 * - Reutiliza PropertyCard existente para consistência visual.
 * - Grid 2 colunas no desktop, 1 coluna no mobile.
 */
export function SimilarProperties({
  properties,
  transactionType,
}: SimilarPropertiesProps) {
  if (!properties || properties.length === 0) {
    return null;
  }

  const searchHref = transactionType === "rent" ? "/alugar" : "/comprar";

  return (
    <section className="space-y-5">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Imóveis Semelhantes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Na mesma cidade e categoria
          </p>
        </div>
        <Link
          href={searchHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors shrink-0"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid de cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>
    </section>
  );
}
