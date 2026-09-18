import React from "react";
import Link from "next/link";
import { Building2, ShieldCheck, ChevronRight, Phone, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Agency } from "@/types/agency";

interface PropertyAgencyCardProps {
  agency?: Agency;
}

export function PropertyAgencyCard({ agency }: PropertyAgencyCardProps) {
  if (!agency) return null;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Imobiliária Responsável
        </span>
        {agency.verifiedAt && (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
            <ShieldCheck className="h-3 w-3 mr-1 text-emerald-600" />
            Verificada
          </Badge>
        )}
      </div>

      <div className="flex items-start gap-4">
        {/* Logo da Imobiliária */}
        <div className="h-14 w-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
          {agency.logoUrl ? (
            <img src={agency.logoUrl} alt={agency.name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-7 w-7 text-slate-400" />
          )}
        </div>

        {/* Informações Institucionais */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
            {agency.name}
          </h3>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
            {agency.creci && <span>CRECI {agency.creci}</span>}
          </div>

          {agency.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1.5 leading-relaxed">
              {agency.description}
            </p>
          )}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <Link
          href={`/imobiliaria/${agency.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
        >
          <span>Ver todos os imóveis desta imobiliária</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
