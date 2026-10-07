"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  Award,
  Phone,
  Mail,
  Globe,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Share2,
  ExternalLink,
  MessageCircle,
  FileText,
  Filter,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerifiedIcon } from "@/components/ui/verified-badge";
import { AgencyClaimModal } from "./AgencyClaimModal";
import { AgencyProfileRequestModal } from "./AgencyProfileRequestModal";
import { AgencyStockCard } from "./AgencyStockCard";
import type { AgencyPublicProfile } from "@/types/agency";

interface AgencyPublicViewProps {
  profile: AgencyPublicProfile;
  currentUser: { id: string; email?: string } | null;
  initialClaimModalOpen?: boolean;
}

export function AgencyPublicView({
  profile,
  currentUser,
  initialClaimModalOpen = false,
}: AgencyPublicViewProps) {
  const { agency, stock, topTypes, neighborhoods } = profile;

  // Modals state
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(initialClaimModalOpen);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestModalType, setRequestModalType] = useState<"correction" | "removal">("correction");

  // Filtering state within agency stock
  const [purposeFilter, setPurposeFilter] = useState<"all" | "sale" | "rent">("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("all");

  const isClaimed = agency.claimStatus === "claimed";
  const isVerified = Boolean(agency.verifiedAt);

  // Filter stock
  const filteredStock = stock.filter((item) => {
    if (purposeFilter === "sale") {
      if (item.transactionType !== "sale" && item.transactionType !== "sale_or_rent" && (!item.offerPrice || item.offerPrice <= 0)) {
        return false;
      }
    }
    if (purposeFilter === "rent") {
      if (item.transactionType !== "rent" && item.transactionType !== "sale_or_rent" && (!item.offerRentPrice || item.offerRentPrice <= 0)) {
        return false;
      }
    }
    if (selectedType !== "all" && item.propertyType !== selectedType) {
      return false;
    }
    if (selectedNeighborhood !== "all" && item.neighborhoodName !== selectedNeighborhood) {
      return false;
    }
    return true;
  });

  const openCorrectionModal = () => {
    setRequestModalType("correction");
    setIsRequestModalOpen(true);
  };

  const openRemovalModal = () => {
    setRequestModalType("removal");
    setIsRequestModalOpen(true);
  };

  const whatsappClean = agency.whatsapp?.replace(/\D/g, "");
  const generalWhatsappUrl = whatsappClean
    ? `https://wa.me/${whatsappClean.startsWith("55") ? whatsappClean : `55${whatsappClean}`}?text=${encodeURIComponent(
        `Olá! Vi o perfil da ${agency.name} no Portal UPPA e gostaria de saber mais sobre seus imóveis.`
      )}`
    : null;

  return (
    <div className="space-y-8 pb-16">
      {/* 1. BANNER DE PERFIL NÃO REIVINDICADO / DESCOBERTO (Seção 5) */}
      {!isClaimed && (
        <section
          aria-label="Aviso de perfil descoberto"
          className="rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 sm:p-5 dark:border-amber-900/40 dark:bg-amber-950/30"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-900 dark:text-amber-200">
                    Perfil ainda não reivindicado pela imobiliária
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300">
                    Fonte Integrada
                  </Badge>
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/80 leading-relaxed max-w-2xl">
                  Estes imóveis foram indexados através de feeds e fontes autorizadas pela UPPA. O responsável legal ainda não assumiu a administração direta deste perfil.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setIsClaimModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
              >
                Você representa esta empresa? Reivindicar perfil
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 2. CABEÇALHO INSTITUCIONAL DA IMOBILIÁRIA (Seção 4) */}
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Logo */}
            <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-xs dark:border-slate-700 dark:bg-slate-800 overflow-hidden">
              {agency.logoUrl ? (
                <img
                  src={agency.logoUrl}
                  alt={agency.name}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <Building2 className="h-12 w-12 text-slate-400" />
              )}
            </div>

            {/* Informações Principais */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {agency.name}
                </h1>

                {/* Selos de Distinção Conceitual (Seção 2) */}
                {isClaimed ? (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900/40 text-[11px] gap-1 py-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Perfil Oficial
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 text-[11px]">
                    Perfil Descoberto
                  </Badge>
                )}

                {isVerified && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-900/40 text-[11px] gap-1 py-1">
                    <VerifiedIcon className="h-3.5 w-3.5" />
                    Imobiliária Verificada
                  </Badge>
                )}
              </div>

              {/* Registro CRECI e Razão Social */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                {agency.creci && (
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    CRECI: {agency.creci}
                  </span>
                )}
                {agency.legalName && agency.legalName !== agency.name && (
                  <span>Razão Social: {agency.legalName}</span>
                )}
                {agency.document && (
                  <span>CNPJ: {agency.document}</span>
                )}
              </div>

              {/* Endereço comercial */}
              {agency.commercialAddress && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 pt-1">
                  <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>{agency.commercialAddress}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ações de Contato Direto */}
          <div className="flex flex-wrap sm:flex-col items-center sm:items-end gap-2.5 shrink-0 pt-2 sm:pt-0">
            {generalWhatsappUrl && (
              <a
                href={generalWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-2 px-4 py-2.5 shadow-xs transition"
              >
                <MessageCircle className="h-4 w-4" />
                Falar no WhatsApp
              </a>
            )}

            {agency.phone && (
              <a
                href={`tel:${agency.phone.replace(/\D/g, "")}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
              >
                <Phone className="h-3.5 w-3.5" />
                {agency.phone}
              </a>
            )}

            {agency.website && (
              <a
                href={agency.website.startsWith("http") ? agency.website : `https://${agency.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 px-3 py-1.5"
              >
                <Globe className="h-3.5 w-3.5" />
                Website Oficial
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Descrição Institucional Real */}
        {agency.description && (
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sobre a Imobiliária
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {agency.description}
            </p>
          </div>
        )}

        {/* Links de Correção / Remoção (Seção 22) */}
        {!isClaimed && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">
              Notou algum dado desatualizado nesta página?
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={openCorrectionModal}
                className="font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:underline"
              >
                Solicitar correção
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={openRemovalModal}
                className="font-medium text-red-500 hover:text-red-600 hover:underline"
              >
                Solicitar remoção
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. RESUMO ESTRUTURADO DE ESTOQUE (Seção 4) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Imóveis no Portfólio</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {profile.totalProperties}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Ofertas Ativas</p>
          <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">
            {profile.activeOffersCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Para Venda</p>
          <p className="mt-1 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {profile.saleCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium text-slate-500">Para Locação</p>
          <p className="mt-1 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            {profile.rentCount}
          </p>
        </div>
      </section>

      {/* 4. VITRINE DE ESTOQUE PUBLICADO (Seções 14, 15 e 16) */}
      <section className="space-y-6" id="estoque">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Imóveis anunciados por {agency.name}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mostrando {filteredStock.length} de {stock.length} ofertas ativas
            </p>
          </div>

          {/* Filtro Rápido de Finalidade */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 shrink-0">
            <button
              onClick={() => setPurposeFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                purposeFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Todos ({stock.length})
            </button>
            <button
              onClick={() => setPurposeFilter("sale")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                purposeFilter === "sale"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Venda ({profile.saleCount})
            </button>
            <button
              onClick={() => setPurposeFilter("rent")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                purposeFilter === "rent"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
              }`}
            >
              Aluguel ({profile.rentCount})
            </button>
          </div>
        </div>

        {/* Filtros Secundários por Tipo e Bairro */}
        {(topTypes.length > 1 || neighborhoods.length > 1) && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 text-xs">
            <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
              <Filter className="h-3.5 w-3.5" />
              Filtrar por:
            </span>

            {topTypes.length > 1 && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Todos os tipos</option>
                {topTypes.map((t) => (
                  <option key={t.type} value={t.type}>
                    {t.label} ({t.count})
                  </option>
                ))}
              </select>
            )}

            {neighborhoods.length > 1 && (
              <select
                value={selectedNeighborhood}
                onChange={(e) => setSelectedNeighborhood(e.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Todos os bairros</option>
                {neighborhoods.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name} ({n.count})
                  </option>
                ))}
              </select>
            )}

            {(selectedType !== "all" || selectedNeighborhood !== "all" || purposeFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSelectedType("all");
                  setSelectedNeighborhood("all");
                  setPurposeFilter("all");
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400 ml-auto"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Grid de Imóveis por Oferta */}
        {filteredStock.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStock.map((item) => (
              <AgencyStockCard
                key={`${item.propertyId}-${item.offerId}`}
                item={item}
                agency={agency}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
            <Building2 className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200">
              Nenhum imóvel encontrado para os filtros selecionados
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Tente redefinir os filtros de busca para visualizar todas as ofertas desta imobiliária.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedType("all");
                setSelectedNeighborhood("all");
                setPurposeFilter("all");
              }}
              className="mt-4 text-xs"
            >
              Ver todos os imóveis
            </Button>
          </div>
        )}
      </section>

      {/* Modais */}
      <AgencyClaimModal
        agency={agency}
        isOpen={isClaimModalOpen}
        onClose={() => setIsClaimModalOpen(false)}
        currentUser={currentUser}
      />

      <AgencyProfileRequestModal
        agency={agency}
        isOpen={isRequestModalOpen}
        initialType={requestModalType}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </div>
  );
}
