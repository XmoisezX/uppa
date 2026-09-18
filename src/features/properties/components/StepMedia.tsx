"use client";

import React, { useState } from "react";
import {
  Image as ImageIcon,
  Star,
  Trash2,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Camera,
  Layers,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { PropertyMedia, MediaType } from "@/types/property";

interface StepMediaProps {
  media: PropertyMedia[];
  onAddMedia: (data: { url: string; type: MediaType; isCover: boolean }) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onSetCover: (mediaId: string) => Promise<void>;
  onReorder: (orderedIds: string[]) => Promise<void>;
}

const PRESET_DEMO_IMAGES = [
  {
    title: "Fachada Moderna",
    url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Living / Sala Ampla",
    url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Cozinha Integrada",
    url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Suíte Master",
    url: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Varanda Gourmet",
    url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  },
];

export function StepMedia({
  media,
  onAddMedia,
  onDeleteMedia,
  onSetCover,
  onReorder,
}: StepMediaProps) {
  const [newUrl, setNewUrl] = useState("");
  const [selectedType, setSelectedType] = useState<MediaType>("image");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const handleAdd = async (urlToAdd?: string) => {
    const targetUrl = urlToAdd || newUrl;
    if (!targetUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const isFirst = media.length === 0;
      await onAddMedia({
        url: targetUrl.trim(),
        type: selectedType,
        isCover: isFirst,
      });
      if (!urlToAdd) setNewUrl("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMove = async (index: number, direction: "left" | "right") => {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= media.length) return;

    const newOrder = [...media];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(targetIndex, 0, moved);

    await onReorder(newOrder.map((m) => m.id));
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <Label className="text-base font-bold text-slate-900 dark:text-white">
          Fotos e Mídias do Imóvel
        </Label>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Adicione fotos de alta qualidade. Anúncios com mais de 5 fotos recebem até 3x mais contatos.
        </p>
      </div>

      {/* ADICIONAR MÍDIA */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
        <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Adicionar Nova Foto ou Vídeo
        </Label>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Input
              placeholder="Cole o link da imagem (URL https://...)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="bg-white dark:bg-slate-900"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as MediaType)}
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="image">Foto (Imagem)</option>
            <option value="floor_plan">Planta Baixa</option>
            <option value="video">Vídeo</option>
            <option value="virtual_tour">Tour 360°</option>
          </select>

          <Button
            type="button"
            onClick={() => handleAdd()}
            disabled={isSubmitting || !newUrl.trim()}
            className="cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Plus className="h-4 w-4 mr-1.5" />
            )}
            Adicionar Foto
          </Button>
        </div>

        {/* Sugestões de Fotos Modelo para Demonstração Rápida */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-2">
            Ou adicione fotos arquitetônicas de exemplo com 1 clique:
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESET_DEMO_IMAGES.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleAdd(preset.url)}
                disabled={isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-indigo-500" />
                {preset.title}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* GALERIA DE MÍDIAS OU EMPTY STATE */}
      {media.length === 0 ? (
        <div className="p-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center bg-white dark:bg-slate-900/40">
          <div className="h-16 w-16 mx-auto rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4">
            <Camera className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Nenhuma foto adicionada ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
            Adicione links de imagens ou utilize os botões de exemplo acima para demonstrar o visual do imóvel.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Total de fotos: <strong className="text-slate-900 dark:text-white">{media.length}</strong>
            </span>
            <span>A primeira foto ou a marcada com estrela será a capa do anúncio.</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {media.map((item, index) => {
              const isCover = item.isCover || index === 0;
              const isProcessing = activeActionId === item.id;

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-xl border-2 overflow-hidden bg-white dark:bg-slate-900 transition-all ${
                    isCover
                      ? "border-amber-500 shadow-md ring-2 ring-amber-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                  }`}
                >
                  {/* Tag de Capa */}
                  {isCover && (
                    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-md">
                      <Star className="h-3 w-3 fill-slate-950" />
                      Foto de Capa
                    </div>
                  )}

                  {/* Imagem */}
                  <div className="aspect-video w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={item.url}
                      alt={`Mídia ${index + 1}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as any).src =
                          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80";
                      }}
                    />
                  </div>

                  {/* Barra de Ações */}
                  <div className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMove(index, "left")}
                        disabled={index === 0 || isProcessing}
                        title="Mover para a esquerda"
                        className="h-7 w-7 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMove(index, "right")}
                        disabled={index === media.length - 1 || isProcessing}
                        title="Mover para a direita"
                        className="h-7 w-7 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isCover && (
                        <button
                          type="button"
                          onClick={async () => {
                            setActiveActionId(item.id);
                            try {
                              await onSetCover(item.id);
                            } finally {
                              setActiveActionId(null);
                            }
                          }}
                          disabled={isProcessing}
                          title="Definir como foto de capa principal"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-amber-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Star className="h-3.5 w-3.5" />
                          Tornar Capa
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          setActiveActionId(item.id);
                          try {
                            await onDeleteMedia(item.id);
                          } finally {
                            setActiveActionId(null);
                          }
                        }}
                        disabled={isProcessing}
                        title="Excluir foto"
                        className="h-7 w-7 rounded border border-red-200 dark:border-red-900/30 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center transition-all cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
