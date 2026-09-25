import React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ícone oficial de verificação: Roseta azul de 12 pontas com checkmark branco
 * Idêntico ao modelo de verificação de grandes portais e redes.
 */
export function VerifiedIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-label="Imobiliária Verificada"
      className={cn("w-4 h-4 shrink-0 text-[#1D9BF0] fill-current", className)}
    >
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.575 9.55.7 10.92.7 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.05 1.273 2.42 2.148 4 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.05 2.148-2.42 2.148-4z" />
      <path d="M10.2 16.2l-3.5-3.5 1.4-1.4 2.1 2.1 5.3-5.3 1.4 1.4z" fill="#ffffff" />
    </svg>
  );
}

/**
 * Pílula oficial de Imobiliária Verificada (idêntica ao modelo anexado pelo usuário)
 */
export function VerifiedAgencyBadge({
  agencyName,
  className,
}: {
  agencyName: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/90 text-blue-950 dark:bg-blue-950/60 dark:text-blue-200 border border-blue-100 dark:border-blue-900/40 text-[11px] sm:text-xs font-bold select-none",
        className
      )}
      title="Imobiliária Verificada e Credenciada pela UPPA"
    >
      <VerifiedIcon className="w-3.5 h-3.5" />
      <span className="truncate max-w-[190px]">{agencyName}</span>
    </span>
  );
}

/**
 * Selo de Imóvel em Destaque
 */
export function FeaturedPropertyBadge({
  className,
  label = "Destaque",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white font-extrabold text-[10px] uppercase tracking-wider shadow-sm select-none",
        className
      )}
    >
      <Star className="w-3 h-3 fill-white" />
      <span>{label}</span>
    </span>
  );
}
