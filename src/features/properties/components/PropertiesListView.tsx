"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  AlertCircle,
  Filter,
  Loader2,
  Trash2,
  AlertTriangle,
  Check,
  X,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { PropertyWithDetails, PropertyStatus } from "@/types/property";
import {
  createDraftPropertyAction,
  deletePropertyAction,
  deletePropertiesBatchAction,
} from "@/features/properties/actions";

interface PropertiesListViewProps {
  initialProperties: PropertyWithDetails[];
  total: number;
  agencyName: string;
}

interface DeleteTarget {
  type: "single" | "batch";
  propertyId?: string;
  propertyTitle?: string;
  count?: number;
  ids?: string[];
}

export function PropertiesListView({
  initialProperties,
  total,
  agencyName,
}: PropertiesListViewProps) {
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithDetails[]>(initialProperties);
  const [totalCount, setTotalCount] = useState(total);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);

  // Estados de seleção e exclusão
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const handleCreateProperty = async () => {
    setIsCreating(true);
    setCreationError(null);
    try {
      const res = await createDraftPropertyAction();
      if (res.success && res.propertyId) {
        router.push(`/painel/imoveis/${res.propertyId}/editar`);
      } else {
        setCreationError(res.error || "Falha ao inicializar rascunho de imóvel.");
        setIsCreating(false);
      }
    } catch (err: any) {
      setCreationError(err?.message || "Erro inesperado ao criar imóvel.");
      setIsCreating(false);
    }
  };

  const filteredProperties = properties.filter((item) => {
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

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProperties.length && filteredProperties.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProperties.map((p) => p.id)));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setCreationError(null);

    try {
      if (deleteTarget.type === "single" && deleteTarget.propertyId) {
        const res = await deletePropertyAction(deleteTarget.propertyId);
        if (!res.success) {
          throw new Error(res.error || "Falha ao excluir imóvel.");
        }
        setProperties((prev) => prev.filter((p) => p.id !== deleteTarget.propertyId));
        setTotalCount((prev) => Math.max(0, prev - 1));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(deleteTarget.propertyId!);
          return next;
        });
        setActionFeedback("Imóvel excluído permanentemente com sucesso.");
      } else if (deleteTarget.type === "batch" && deleteTarget.ids) {
        const res = await deletePropertiesBatchAction(deleteTarget.ids);
        if (!res.success) {
          throw new Error(res.error || "Falha ao excluir imóveis em lote.");
        }
        const deletedSet = new Set(deleteTarget.ids);
        setProperties((prev) => prev.filter((p) => !deletedSet.has(p.id)));
        setTotalCount((prev) => Math.max(0, prev - (res.deletedCount || deleteTarget.ids!.length)));
        setSelectedIds(new Set());
        setActionFeedback(
          `${res.deletedCount || deleteTarget.ids.length} imóveis excluídos permanentemente com sucesso.`
        );
      }

      setDeleteTarget(null);
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setCreationError(err?.message || "Erro ao processar exclusão.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val?: number | null) => {
    if (!val) return "Consulte";
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  const isAllSelected =
    filteredProperties.length > 0 && selectedIds.size === filteredProperties.length;

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
              {totalCount} imóvel{totalCount === 1 ? "" : "is"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Estoque de imóveis da <strong className="text-slate-700 dark:text-slate-300">{agencyName}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleCreateProperty}
            disabled={isCreating}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer shadow-xs"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Criando Rascunho...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1.5" />
                Cadastrar Imóvel
              </>
            )}
          </Button>
        </div>
      </div>

      {/* FEEDBACK DE SUCESSO */}
      {actionFeedback && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{actionFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionFeedback(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ALERTA DE ERRO */}
      {creationError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <span>{creationError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCreationError(null)}
            className="font-bold underline cursor-pointer ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {/* Abas de Status */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: "Todos" },
            { id: "active", label: "Ativos" },
            { id: "inactive", label: "Inativos" },
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

      {/* BARRA DE AÇÃO EM LOTE (QUANDO HOUVER ITENS SELECIONADOS) */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-20 p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/95 dark:border-indigo-900/50 dark:bg-indigo-950/90 backdrop-blur-md shadow-md flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
              {selectedIds.size} {selectedIds.size === 1 ? "imóvel selecionado" : "imóveis selecionados"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs h-8 cursor-pointer"
            >
              Desmarcar todos
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() =>
                setDeleteTarget({
                  type: "batch",
                  count: selectedIds.size,
                  ids: Array.from(selectedIds),
                })
              }
              className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer shadow-xs gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir selecionados ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* TOOLBAR SUPERIOR DA LISTA (SELECIONAR TODOS) */}
      {filteredProperties.length > 0 && (
        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <label className="inline-flex items-center gap-2 cursor-pointer font-medium hover:text-slate-800 dark:hover:text-slate-200 select-none">
            <input
              type="checkbox"
              checked={isAllSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>
              {isAllSelected ? "Desmarcar todos" : `Selecionar todos (${filteredProperties.length})`}
            </span>
          </label>

          <span>
            Mostrando {filteredProperties.length} de {totalCount}
          </span>
        </div>
      )}

      {/* LISTA DE IMÓVEIS OU EMPTY STATE */}
      {properties.length === 0 ? (
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
            <Button
              onClick={handleCreateProperty}
              disabled={isCreating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold cursor-pointer"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Criando Rascunho...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Cadastrar Primeiro Imóvel
                </>
              )}
            </Button>
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
            const isInactive = prop.status === "inactive";
            const isSelected = selectedIds.has(prop.id);

            return (
              <div
                key={prop.id}
                className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border transition-all shadow-xs ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50/20 dark:border-indigo-500 dark:bg-indigo-950/20"
                    : "border-slate-200 bg-white hover:border-indigo-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-800"
                }`}
              >
                {/* Checkbox de Seleção + Imagem + Dados Básicos */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* Checkbox individual */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelectOne(prop.id)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    aria-label={`Selecionar imóvel ${prop.title}`}
                  />

                  {/* Foto de capa */}
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
                            : isInactive
                            ? "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 text-[10px]"
                            : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                        }
                      >
                        {isActive
                          ? "ATIVO"
                          : isDraft
                          ? "RASCUNHO"
                          : isInactive
                          ? "INATIVO"
                          : prop.status.toUpperCase()}
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

                  <div className="flex items-center gap-1.5">
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
                        className="text-xs font-semibold cursor-pointer h-8"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </Link>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setDeleteTarget({
                          type: "single",
                          propertyId: prop.id,
                          propertyTitle: prop.title,
                        })
                      }
                      className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/40 cursor-pointer h-8 px-2"
                      title="Excluir imóvel"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (INDIVIDUAL OU EM LOTE) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {deleteTarget.type === "single"
                    ? "Excluir Imóvel"
                    : `Excluir ${deleteTarget.count} Imóveis`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Esta ação é irreversível e removerá os anúncios permanentemente.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
              {deleteTarget.type === "single" ? (
                <>
                  Deseja realmente apagar o anúncio:
                  <span className="font-bold block mt-1 text-slate-900 dark:text-white truncate">
                    &quot;{deleteTarget.propertyTitle || "Sem título"}&quot;
                  </span>
                </>
              ) : (
                <>
                  Deseja realmente apagar permanentemente os{" "}
                  <strong className="text-slate-900 dark:text-white font-bold">
                    {deleteTarget.count} imóveis selecionados
                  </strong>{" "}
                  do estoque da imobiliária? Todas as fotos e dados vinculados serão excluídos.
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="text-xs font-semibold cursor-pointer h-9 px-4"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer h-9 px-4 gap-1.5 shadow-xs"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    Sim, Excluir Definitivamente
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
