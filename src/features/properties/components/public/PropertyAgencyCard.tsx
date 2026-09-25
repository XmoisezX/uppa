import React from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  ChevronRight,
  Phone,
  MessageSquare,
  Globe,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedIcon } from "@/components/ui/verified-badge";
import type { Agency } from "@/types/agency";

interface PropertyAgencyCardProps {
  agency?: Agency;
}

export function PropertyAgencyCard({ agency }: PropertyAgencyCardProps) {
  if (!agency) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Anúncio Verificado UPPA
          </h3>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          Este imóvel foi cadastrado por uma imobiliária parceira credenciada no Portal UPPA. Todas as informações são de responsabilidade do anunciante.
        </p>
      </div>
    );
  }

  const phone = agency.phone || agency.whatsapp;
  const whatsappClean = agency.whatsapp?.replace(/\D/g, "");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
      {/* CABEÇALHO DO ANUNCIANTE */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Imobiliária Anunciante
        </span>
        {agency.verifiedAt && (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/40 text-[10px] gap-1">
            <VerifiedIcon className="w-3.5 h-3.5" />
            Imobiliária Verificada
          </Badge>
        )}
      </div>

      {/* DADOS PRINCIPAIS */}
      <div className="flex items-start gap-4">
        {/* Logo da Imobiliária */}
        <div className="h-16 w-16 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
          {agency.logoUrl ? (
            <img src={agency.logoUrl} alt={agency.name} className="h-full w-full object-cover" />
          ) : (
            <Building2 className="h-8 w-8 text-slate-400" />
          )}
        </div>

        {/* Informações Institucionais */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
              {agency.name}
            </h3>
            {agency.verifiedAt && <VerifiedIcon className="w-4 h-4 shrink-0" />}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
            {agency.creci && (
              <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]">
                CRECI {agency.creci}
              </span>
            )}
            {phone && <span>Tel: {phone}</span>}
          </div>

          {agency.description && (
            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mt-2 leading-relaxed">
              {agency.description}
            </p>
          )}
        </div>
      </div>

      {/* CANAIS DE CONTATO E LINKS */}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {agency.whatsapp && (
          <a
            href={`https://wa.me/${whatsappClean.startsWith("55") ? whatsappClean : `55${whatsappClean}`}?text=${encodeURIComponent(`Olá! Vi os anúncios da ${agency.name} na UPPA e gostaria de informações.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5 fill-current" />
            <span>Falar no WhatsApp</span>
          </a>
        )}

        {agency.website && (
          <a
            href={agency.website.startsWith("http") ? agency.website : `https://${agency.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Site Oficial</span>
          </a>
        )}

        <Link
          href={`/imobiliaria/${agency.slug}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 ml-auto transition-colors"
        >
          <span>Todos os imóveis desta imobiliária</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* DISCLAIMER DO PORTAL UPPA (UPPA como classificados, não proprietária) */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
        <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Aviso do Portal UPPA:</strong> A UPPA é um portal de divulgação imobiliária e não intermedia propostas nem é proprietária do imóvel. Toda a negociação, visitação e contratos são realizados de forma direta com o anunciante credenciado <strong>{agency.name}</strong>.
        </span>
      </div>
    </div>
  );
}
