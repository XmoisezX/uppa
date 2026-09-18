import React from "react";
import { Check, HandCoins, ArrowLeftRight, Car } from "lucide-react";
import type { PropertyWithDetails } from "@/types/property";

interface PropertyPricingProps {
  property: PropertyWithDetails;
}

export function PropertyPricing({ property }: PropertyPricingProps) {
  const formatCurrency = (val?: number | null) => {
    if (!val) return null;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const isRent = property.transactionType === "rent";
  const isSale = property.transactionType === "sale";
  const isBoth = property.transactionType === "sale_or_rent";

  const salePriceFormatted = formatCurrency(property.price);
  const rentPriceFormatted = formatCurrency(property.rentPrice);
  const condoFormatted = formatCurrency(property.condominiumFee);
  const iptuFormatted = formatCurrency(property.iptu);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/50 space-y-4">
      {/* VALORES PRINCIPAIS */}
      <div className="flex flex-wrap items-baseline gap-6">
        {(isSale || isBoth) && (
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Valor de Venda
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {salePriceFormatted || "Consulte"}
            </span>
          </div>
        )}

        {(isRent || isBoth) && (
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Valor de Locação
            </span>
            <span className="text-3xl font-black text-slate-900 dark:text-white">
              {rentPriceFormatted || "Consulte"}
              <span className="text-sm font-semibold text-slate-400 font-normal"> /mês</span>
            </span>
          </div>
        )}
      </div>

      {/* ENCARGOS SECUNDÁRIOS */}
      {(condoFormatted || iptuFormatted) && (
        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
          {condoFormatted && (
            <div>
              <span className="font-semibold text-slate-500">Condomínio: </span>
              <strong className="text-slate-900 dark:text-slate-200">{condoFormatted}/mês</strong>
            </div>
          )}

          {iptuFormatted && (
            <div>
              <span className="font-semibold text-slate-500">IPTU: </span>
              <strong className="text-slate-900 dark:text-slate-200">{iptuFormatted}/ano</strong>
            </div>
          )}
        </div>
      )}

      {/* CONDIÇÕES DE NEGOCIAÇÃO */}
      {(property.financiable || property.acceptsExchange || property.acceptsVehicle) && (
        <div className="flex flex-wrap gap-2 pt-2">
          {property.financiable && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs font-semibold">
              <Check className="h-3.5 w-3.5" />
              Aceita Financiamento
            </span>
          )}

          {property.acceptsExchange && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300 text-xs font-semibold">
              <ArrowLeftRight className="h-3.5 w-3.5" />
              Aceita Permuta
            </span>
          )}

          {property.acceptsVehicle && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 text-xs font-semibold">
              <Car className="h-3.5 w-3.5" />
              Aceita Veículo
            </span>
          )}
        </div>
      )}
    </div>
  );
}
