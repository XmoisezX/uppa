"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  MapPin,
  Bed,
  Car,
  Maximize,
  Edit,
  ExternalLink,
  Sparkles,
  AlertCircle,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PropertyWithDetails, PropertyStatus } from "@/types/property";

interface PropertiesListViewProps {
  initialProperties: PropertyWithDetails[];
  total: number;
  agencyName: string;
}

export function PropertiesListView({
  initialProperties,
  total,
  agencyName,
}: PropertiesListViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  const filteredProperties = initialProperties.filter((item) => {
    // Filtro de status
    if (selectedStatus !== "all" && item.status !== selectedStatus) {
      return false;
    }
    // Filtro de busca por termo
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(term);
      const matchRef = item.externalId?.toLowerCase().includes(term);
      const matchCity = item.city?.name?.toLowerCase().includes(term);
      if (!matchTitle && !matchRef && !matchCity) return false;
    }
    return true;
  });

  const formatCurrency = (val?: number | null) => {
    if (!val) return "Consulte";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Gestão de Imóveis
            </h1>
            <Badge variant="secondary" className="text-xs font-semibold">
              {total} imóvel{total === 1 ? "" : "is"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Estoque de imóveis da <strong className="text-slate-700 dark:text-slate-300">{agencyName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/painel/imoveis/novo">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs">
              <Plus className="h-4 w-4 mr-1.5" />
              Cadastrar Imóvel
            </Button>
          </Link>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Abas de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "Todos" },
            { id: "active", label: "Ativos" },
            { id: "draft", label: "Rascunhos" },
            { id: "paused", label: "Pausados" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedStatus === tab.id
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="Buscar por título, código ou cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>
      </div>

      {/* LISTA DE IMÓVEIS OU EMPTY STATE */}
      {initialProperties.length === 0 ? (
        /* EMPTY STATE: NENHUM IMÓVEL CADASTRADO */
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
          <div className="h-16 w-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <Building2 className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Nenhum imóvel cadastrado ainda
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Comece a cadastrar o portfólio da sua imobiliária em 7 etapas rápidas com salvamento automático.
          </p>
          <div className="mt-6">
            <Link href="/painel/imoveis/novo">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer">
                <Plus className="h-4 w-4 mr-1.5" />
                Cadastrar Primeiro Imóvel
              </Button>
            </Link>
          </div>
        </div>
      ) : filteredProperties.length === 0 ? (
        /* EMPTY STATE: NENHUM RESULTADO NA BUSCA */
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Filter className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Nenhum imóvel corresponde aos filtros
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Tente buscar com outros termos ou selecione a aba &quot;Todos&quot;.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearchTerm("");
              setSelectedStatus("all");
            }}
            className="mt-4 cursor-pointer"
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        /* TABELA / CARDS DE IMÓVEIS */
        <div className="space-y-3">
          {filteredProperties.map((prop) => {
            const coverImage = prop.media?.find((m) => m.isCover) || prop.media?.[0];
            const isDraft = prop.status === "draft";
            const isActive = prop.status === "active";

            return (
              <div
                key={prop.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800 transition-all shadow-xs"
              >
                {/* Imagem + Dados Básicos */}
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-18 w-26 sm:h-20 sm:w-28 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 relative">
                    {coverImage ? (
                      <img
                        src={coverImage.url}
                        alt={prop.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-400">
                        <Building2 className="h-6 w-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="outline"
                        className={
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
                            : isDraft
                            ? "bg-amber-50 text-amber-700 border-amber-200 text-[10px]"
                            : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                        }
                      >
                        {isActive ? "ATIVO" : isDraft ? "RASCUNHO" : prop.status.toUpperCase()}
                      </Badge>

                      <span className="text-[11px] font-mono text-slate-400">
                        Ref: {prop.externalId}
                      </span>
                    </div>

                    <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {prop.title || "Novo Imóvel (Rascunho)"}
                    </h2>

                    <div className="flex items-center gap-1 text-xs text-slate-500 truncate mt-0.5">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {prop.city?.name ? `${prop.city.name} - ${prop.state?.code || ""}` : "Localização a definir"}
                      </span>
                    </div>

                    {/* Especificações */}
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                      {prop.bedrooms > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Bed className="h-3 w-3" /> {prop.bedrooms} qtos
                        </span>
                      )}
                      {prop.parkingSpaces > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3 w-3" /> {prop.parkingSpaces} vg
                        </span>
                      )}
                      {prop.usableArea && (
                        <span className="inline-flex items-center gap-1">
                          <Maximize className="h-3 w-3" /> {prop.usableArea} m²
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preço e Ações */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800 shrink-0 gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-xs font-semibold text-slate-400 block">
                      {prop.transactionType === "rent" ? "Locação" : "Venda"}
                    </span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {formatCurrency(
                        prop.transactionType === "rent" ? prop.rentPrice : prop.price
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive && (
                      <Link
                        href={`/imovel/${prop.slug}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all text-xs"
                        title="Ver no portal público"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    )}

                    <Link href={`/painel/imoveis/${prop.id}/editar`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs font-semibold cursor-pointer"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
