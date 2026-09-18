"use client";

import React, { useState, useEffect } from "react";
import {
  Camera,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Building2,
  Share2,
  Check,
} from "lucide-react";
import type { PropertyMedia } from "@/types/property";

interface PropertyGalleryProps {
  media: PropertyMedia[];
  title: string;
}

export function PropertyGallery({ media, title }: PropertyGalleryProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Fecha modal com a tecla Esc e navega com setas
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === "Escape") setSelectedPhotoIndex(null);
      if (e.key === "ArrowLeft") {
        setSelectedPhotoIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : media.length - 1));
      }
      if (e.key === "ArrowRight") {
        setSelectedPhotoIndex((prev) => (prev !== null && prev < media.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhotoIndex, media.length]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback para cópia
      }
    }
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!media || media.length === 0) {
    return (
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-800">
        <Building2 className="h-16 w-16 mb-2 stroke-[1.5]" />
        <span className="text-sm font-semibold">Sem fotos cadastradas</span>
      </div>
    );
  }

  const coverPhoto = media.find((m) => m.isCover) || media[0];
  const otherPhotos = media.filter((m) => m.id !== coverPhoto.id);

  return (
    <div className="space-y-3">
      {/* GRID DE FOTOS PRINCIPAL */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm">
        {/* Layout com 1 ou mais fotos */}
        {media.length === 1 ? (
          <div
            onClick={() => setSelectedPhotoIndex(0)}
            className="aspect-[16/9] md:aspect-[21/9] w-full cursor-pointer overflow-hidden group"
          >
            <img
              src={media[0].url}
              alt={title}
              className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 aspect-[16/10] md:aspect-[21/9] max-h-[520px]">
            {/* Foto de Capa (Ocupa 2 colunas e 2 linhas) */}
            <div
              onClick={() => setSelectedPhotoIndex(media.findIndex((m) => m.id === coverPhoto.id))}
              className="md:col-span-2 md:row-span-2 relative cursor-pointer overflow-hidden group bg-slate-100 dark:bg-slate-800"
            >
              <img
                src={coverPhoto.url}
                alt={title}
                className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-500"
              />
            </div>

            {/* Fotos Secundárias */}
            {otherPhotos.slice(0, 4).map((item, idx) => {
              const originalIndex = media.findIndex((m) => m.id === item.id);
              const isLastVisible = idx === 3 && otherPhotos.length > 4;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPhotoIndex(originalIndex)}
                  className="hidden md:block relative cursor-pointer overflow-hidden group bg-slate-100 dark:bg-slate-800"
                >
                  <img
                    src={item.url}
                    alt={`${title} - foto ${idx + 2}`}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Overlay "+X fotos" no último card visível */}
                  {isLastVisible && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm hover:bg-black/50 transition-colors">
                      +{otherPhotos.length - 3} fotos
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Botão Ver Todas as Fotos */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 text-xs font-semibold backdrop-blur-md shadow-md hover:bg-white dark:hover:bg-slate-900 transition-all cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
            {copied ? "Link copiado!" : "Compartilhar"}
          </button>

          <button
            type="button"
            onClick={() => setSelectedPhotoIndex(0)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900/90 text-white text-xs font-bold backdrop-blur-md shadow-md hover:bg-slate-900 transition-all cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Ver todas as {media.length} fotos</span>
          </button>
        </div>
      </div>

      {/* MODAL LIGHTBOX / TELA CHEIA */}
      {selectedPhotoIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 backdrop-blur-md animate-in fade-in duration-200">
          {/* Topo do modal */}
          <div className="w-full flex items-center justify-between text-white max-w-6xl py-2">
            <span className="text-xs font-mono text-slate-300">
              Foto {selectedPhotoIndex + 1} de {media.length}
            </span>

            <button
              type="button"
              onClick={() => setSelectedPhotoIndex(null)}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors cursor-pointer"
              title="Fechar (Esc)"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Imagem Central e Setas de Navegação */}
          <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center">
            {media.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedPhotoIndex((prev) => (prev! > 0 ? prev! - 1 : media.length - 1))
                }
                className="absolute left-2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            <div className="max-h-[75vh] max-w-full overflow-hidden rounded-xl">
              <img
                src={media[selectedPhotoIndex].url}
                alt={`${title} - Foto ${selectedPhotoIndex + 1}`}
                className="max-h-[75vh] w-auto object-contain mx-auto select-none"
              />
            </div>

            {media.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setSelectedPhotoIndex((prev) => (prev! < media.length - 1 ? prev! + 1 : 0))
                }
                className="absolute right-2 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/80 transition-all cursor-pointer"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Miniaturas no Rodapé do Modal */}
          <div className="w-full max-w-4xl overflow-x-auto py-2 flex items-center justify-center gap-2">
            {media.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`h-12 w-18 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                  selectedPhotoIndex === idx
                    ? "border-indigo-500 scale-105"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <img src={item.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
