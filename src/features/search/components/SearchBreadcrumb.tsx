import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import type { SearchFilters } from "../types";

interface SearchBreadcrumbProps {
  filters: SearchFilters;
  cityName?: string;
  stateCode?: string;
  neighborhoodName?: string;
}

export function SearchBreadcrumb({
  filters,
  cityName,
  stateCode,
  neighborhoodName,
}: SearchBreadcrumbProps) {
  const isRent = filters.transactionType === "rent";
  const basePath = isRent ? "/alugar" : "/comprar";
  const baseLabel = isRent ? "Imóveis para alugar" : "Imóveis à venda";

  const resolvedState = stateCode || filters.state;
  const resolvedCity = cityName || filters.city;
  const resolvedNeighborhood = neighborhoodName || filters.neighborhood;

  return (
    <nav aria-label="Breadcrumb" className="text-xs text-slate-500 py-1.5 overflow-x-auto">
      <ol className="flex items-center gap-1.5 whitespace-nowrap">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span>Início</span>
          </Link>
        </li>

        <li className="flex items-center gap-1.5">
          <ChevronRight className="h-3 w-3 text-slate-400" />
          <Link
            href={basePath}
            className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
              !resolvedState && !resolvedCity ? "font-semibold text-slate-800 dark:text-slate-200" : ""
            }`}
          >
            {baseLabel}
          </Link>
        </li>

        {resolvedState && (
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Link
              href={`${basePath}?state=${resolvedState.toUpperCase()}`}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                !resolvedCity ? "font-semibold text-slate-800 dark:text-slate-200" : ""
              }`}
            >
              {resolvedState.toUpperCase()}
            </Link>
          </li>
        )}

        {resolvedCity && (
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <Link
              href={`${basePath}?${resolvedState ? `state=${resolvedState.toUpperCase()}&` : ""}city=${resolvedCity}`}
              className={`hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${
                !resolvedNeighborhood ? "font-semibold text-slate-800 dark:text-slate-200" : ""
              }`}
            >
              {resolvedCity}
            </Link>
          </li>
        )}

        {resolvedNeighborhood && (
          <li className="flex items-center gap-1.5">
            <ChevronRight className="h-3 w-3 text-slate-400" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {resolvedNeighborhood}
            </span>
          </li>
        )}
      </ol>
    </nav>
  );
}
