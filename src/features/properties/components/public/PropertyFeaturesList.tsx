import React from "react";
import { Sparkles, Check } from "lucide-react";
import type { Feature } from "@/types/property";

interface PropertyFeaturesListProps {
  features?: Feature[];
}

export function PropertyFeaturesList({ features }: PropertyFeaturesListProps) {
  if (!features || features.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Comodidades e Diferenciais
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {features.map((feat) => (
          <div
            key={feat.id}
            className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
          >
            <div className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Check className="h-3 w-3 stroke-[3]" />
            </div>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {feat.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
