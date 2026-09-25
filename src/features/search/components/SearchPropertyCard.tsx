"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bed,
  Bath,
  Car,
  Maximize,
  Building2,
  Heart,
  Camera,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import { VerifiedAgencyBadge, FeaturedPropertyBadge } from "@/components/ui/verified-badge";
import type { SearchPropertyItem } from "../types";

interface SearchPropertyCardProps {
  property: SearchPropertyItem;
  isHovered?: boolean;
  onHover?: (id: string | null) => void;
}

export function SearchPropertyCard({
  property,
  isHovered,
  onHover,
}: SearchPropertyCardProps) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Carrega até 5 fotos para o carrossel do card
  const rawMedia = property.media || [];
  const photos = rawMedia.slice(0, 5);
  const totalPhotos = rawMedia.length;

  const currentPhoto = photos[currentPhotoIndex]?.url || photos[0]?.url;
  const isLastPhoto = photos.length > 1 && currentPhotoIndex === photos.length - 1;

  const isRent = property.transactionType === "rent";
  const isSaleOrRent = property.transactionType === "sale_or_rent";

  const formatMoney = (val?: number | null) => {
    if (!val || val <= 0) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const salePriceFormatted = formatMoney(property.price);
  const rentPriceFormatted = formatMoney(property.rentPrice);
  const condFeeFormatted = formatMoney(property.condominiumFee);

  const neighborhoodName = property.neighborhood?.name;
  const cityName = property.city?.name;
  const stateCode = property.state?.code;

  const locationBold = (() => {
    const parts: string[] = [];
    if (neighborhoodName) parts.push(neighborhoodName);
    if (cityName) parts.push(cityName);
    const joined = parts.join(", ");
    return stateCode ? joined + "/" + stateCode : joined || "Brasil";
  })();

  const streetAddress = (() => {
    if (property.addressVisible && property.street) {
      return property.number ? `${property.street}, ${property.number}` : property.street;
    }
    return null;
  })();

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFavorited((prev) => !prev);
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPhotoIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const phoneNumber = property.agency?.phone || "";
    if (phoneNumber) {
      const cleanPhone = phoneNumber.replace(/\D/g, "");
      const msg = encodeURIComponent(
        `Olá! Vi o anúncio do imóvel "${property.title}" na UPPA e gostaria de mais informações.`
      );
      window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, "_blank");
    } else {
      window.location.href = `/imovel/${property.slug}#contato`;
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.location.href = `/imovel/${property.slug}#contato`;
  };

  return (
    <article
      onMouseEnter={() => onHover && onHover(property.id)}
      onMouseLeave={() => onHover && onHover(null)}
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col sm:flex-row w-full ${
        isHovered
          ? "border-indigo-500 shadow-md ring-1 ring-indigo-500"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md"
      }`}
    >
      {/* 1. MÍDIA / CARROSSEL DE FOTOS (ATÉ 5 FOTOS COM FILTRO E '+' NA ÚLTIMA) */}
      <div className="relative w-full sm:w-[340px] md:w-[380px] lg:w-[410px] xl:w-[440px] aspect-[16/10] sm:aspect-auto sm:min-h-[250px] overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
        {currentPhoto && !imageError ? (
          <Link
            href={isLastPhoto ? `/imovel/${property.slug}#fotos` : `/imovel/${property.slug}`}
            tabIndex={-1}
            prefetch={false}
            className="block h-full w-full relative"
          >
            <img
              src={currentPhoto}
              alt={`${property.title} - foto ${currentPhotoIndex + 1}`}
              loading="lazy"
              decoding="async"
              onError={() => setImageError(true)}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-300 ${
                isLastPhoto
                  ? "brightness-[0.45] contrast-[1.05] filter backdrop-blur-[1px]"
                  : "group-hover:scale-[1.03]"
              }`}
            />

            {/* FILTRO E ÍCONE '+' NA ÚLTIMA FOTO */}
            {isLastPhoto && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] flex flex-col items-center justify-center text-white pointer-events-none transition-all">
                <div className="h-13 w-13 rounded-full bg-white/20 border-2 border-white/70 flex items-center justify-center shadow-2xl backdrop-blur-md mb-2 group-hover:scale-110 transition-transform">
                  <Plus className="h-7 w-7 text-white stroke-[3]" />
                </div>
                <span className="text-xs font-black text-white uppercase tracking-wider drop-shadow-md">
                  {totalPhotos > photos.length
                    ? `+${totalPhotos - photos.length + 1} fotos`
                    : "Ver todas as fotos"}
                </span>
              </div>
            )}
          </Link>
        ) : (
          <div className="h-full w-full min-h-[180px] flex flex-col items-center justify-center text-slate-400 bg-slate-100 dark:bg-slate-800 gap-1">
            <Building2 className="h-8 w-8 stroke-[1.5]" />
            <span className="text-[10px] font-medium">Foto indisponível</span>
          </div>
        )}

        {/* Badge de Finalidade e Destaque */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 flex-wrap">
          {property.featured && <FeaturedPropertyBadge />}
          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-950/85 text-white font-bold text-[10px] uppercase tracking-wide backdrop-blur-xs">
            {isRent ? "Locação" : isSaleOrRent ? "Venda/Loc." : "Venda"}
          </span>
        </div>

        {/* SETAS LATERAIS DO CARROSSEL (Visíveis no hover do card) */}
        {photos.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrevPhoto}
              aria-label="Foto anterior"
              className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-xs shadow-md cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              aria-label="Próxima foto"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-xs shadow-md cursor-pointer hover:scale-110 active:scale-95"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* CONTROLES ESTILO CHAVES NA MÃO: [ < ] [ > ] NO CANTO INFERIOR DIREITO */}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-0.5 bg-black/65 backdrop-blur-md rounded-xl p-1 border border-white/20 shadow-md">
            <button
              type="button"
              onClick={handlePrevPhoto}
              aria-label="Foto anterior"
              className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextPhoto}
              aria-label="Próxima foto"
              className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Indicador de Fotos (Ex: 1/5) no canto inferior esquerdo */}
        {totalPhotos > 0 && (
          <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/65 text-white text-[11px] font-semibold backdrop-blur-xs">
            <Camera className="h-3.5 w-3.5" />
            <span>
              {currentPhotoIndex + 1}/{totalPhotos}
            </span>
          </div>
        )}

        {/* Indicadores de pontinhos no rodapé da imagem */}
        {photos.length > 1 && (
          <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-10 hidden sm:flex items-center gap-1.5 pointer-events-none">
            {photos.map((_, idx) => (
              <span
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentPhotoIndex
                    ? "w-4 bg-white"
                    : "w-1.5 bg-white/60"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. CONTEÚDO LATERAL DO CARD (FORMATO DE LISTA) */}
      <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between min-w-0">
        <div>
          {/* TOPO: TÍTULO / DESCRIÇÃO + BOTÃO DE FAVORITOS */}
          <div className="flex items-start justify-between gap-3">
            <Link
              href={"/imovel/" + property.slug}
              className="block group/title flex-1 min-w-0"
            >
              <h3 className="text-sm sm:text-base font-normal text-slate-700 dark:text-slate-300 group-hover/title:text-indigo-600 dark:group-hover/title:text-indigo-400 line-clamp-2 leading-snug transition-colors">
                {property.title}
              </h3>
            </Link>

            {/* Botão de Favorito no topo direito do conteúdo */}
            <button
              type="button"
              onClick={handleFavoriteClick}
              aria-label={isFavorited ? "Remover dos favoritos" : "Salvar imóvel"}
              className="h-9 w-9 rounded-full bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-slate-500 hover:text-red-500 transition-all cursor-pointer shrink-0 shadow-2xs"
            >
              <Heart
                className={
                  "h-4.5 w-4.5 transition-colors " +
                  (isFavorited ? "fill-red-500 text-red-500" : "")
                }
              />
            </button>
          </div>

          {/* IMOBILIÁRIA / SELO VERIFICADO */}
          {property.agency?.name && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {property.agency.verifiedAt ? (
                <VerifiedAgencyBadge agencyName={property.agency.name} />
              ) : (
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                  {property.agency.name}
                </span>
              )}
            </div>
          )}

          {/* LOCALIZAÇÃO (BAIRRO, CIDADE/UF + LOGRADOURO) */}
          <div className="mt-2.5 space-y-0.5">
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight truncate">
              {locationBold}
            </p>
            {streetAddress && (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {streetAddress}
              </p>
            )}
          </div>

          {/* ESPECIFICAÇÕES FÍSICAS COM ÍCONES */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {property.usableArea && property.usableArea > 0 && (
              <span className="flex items-center gap-1.5">
                <Maximize className="h-4 w-4 text-slate-400 shrink-0" />
                <span>{property.usableArea} m²</span>
              </span>
            )}
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {property.bedrooms} {property.bedrooms === 1 ? "quarto" : "quartos"}
                </span>
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {property.bathrooms} {property.bathrooms === 1 ? "banheiro" : "banheiros"}
                </span>
              </span>
            )}
            {property.parkingSpaces > 0 && (
              <span className="flex items-center gap-1.5">
                <Car className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {property.parkingSpaces} {property.parkingSpaces === 1 ? "vaga" : "vagas"}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* 3. RODAPÉ: PREÇO EM DESTAQUE + BOTÕES WHATSAPP E CONTATO */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            {isSaleOrRent ? (
              <div className="space-y-0.5">
                {salePriceFormatted && (
                  <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                    {salePriceFormatted}
                  </div>
                )}
                {rentPriceFormatted && (
                  <div className="text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-400">
                    Aluguel {rentPriceFormatted}/mês
                  </div>
                )}
              </div>
            ) : isRent ? (
              <div className="flex items-baseline gap-1">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                  {rentPriceFormatted || "Sob consulta"}
                </span>
                {rentPriceFormatted && (
                  <span className="text-xs text-slate-500 font-medium">/mês</span>
                )}
              </div>
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                {salePriceFormatted || "Sob consulta"}
              </div>
            )}
            {condFeeFormatted && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Condomínio {condFeeFormatted}
              </p>
            )}
          </div>

          {/* BOTÕES DE AÇÃO: WHATSAPP VERDE + FALAR COM O ANUNCIANTE */}
          <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
            {property.agency?.phone && (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                aria-label="Contato via WhatsApp"
                title="Falar no WhatsApp"
                className="h-11 w-11 flex items-center justify-center rounded-xl bg-[#25D366] hover:bg-[#20BD5C] text-white transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <MessageCircle className="h-5 w-5 fill-white stroke-none" />
              </button>
            )}
            <button
              type="button"
              onClick={handleContactClick}
              className="flex-1 sm:flex-none h-11 px-5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 text-white font-bold text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer shadow-xs"
            >
              Falar com o anunciante
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

