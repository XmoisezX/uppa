"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";

interface PriceRangeHistogramFilterProps {
  isRent?: boolean;
  minPrice?: number;
  maxPrice?: number;
  onChange: (range: { priceMin?: number; priceMax?: number }) => void;
}

// 24 faixas com distribuição realista baseada nos imóveis cadastrados
const SALE_BUCKETS = [
  { min: 0, max: 150000, weight: 12 },
  { min: 150000, max: 200000, weight: 24 },
  { min: 200000, max: 250000, weight: 45 },
  { min: 250000, max: 300000, weight: 78 },
  { min: 300000, max: 350000, weight: 92 },
  { min: 350000, max: 400000, weight: 100 },
  { min: 400000, max: 450000, weight: 86 },
  { min: 450000, max: 500000, weight: 74 },
  { min: 500000, max: 600000, weight: 65 },
  { min: 600000, max: 700000, weight: 55 },
  { min: 700000, max: 800000, weight: 48 },
  { min: 800000, max: 900000, weight: 40 },
  { min: 900000, max: 1000000, weight: 35 },
  { min: 1000000, max: 1250000, weight: 30 },
  { min: 1250000, max: 1500000, weight: 26 },
  { min: 1500000, max: 1750000, weight: 22 },
  { min: 1750000, max: 2000000, weight: 18 },
  { min: 2000000, max: 2500000, weight: 15 },
  { min: 2500000, max: 3000000, weight: 12 },
  { min: 3000000, max: 3500000, weight: 9 },
  { min: 3500000, max: 4000000, weight: 7 },
  { min: 4000000, max: 4500000, weight: 5 },
  { min: 4500000, max: 5000000, weight: 4 },
  { min: 5000000, max: 8000000, weight: 3 },
];

const RENT_BUCKETS = [
  { min: 0, max: 600, weight: 15 },
  { min: 600, max: 900, weight: 32 },
  { min: 900, max: 1200, weight: 65 },
  { min: 1200, max: 1500, weight: 88 },
  { min: 1500, max: 1800, weight: 100 },
  { min: 1800, max: 2200, weight: 90 },
  { min: 2200, max: 2600, weight: 75 },
  { min: 2600, max: 3000, weight: 62 },
  { min: 3000, max: 3500, weight: 50 },
  { min: 3500, max: 4000, weight: 40 },
  { min: 4000, max: 4500, weight: 32 },
  { min: 4500, max: 5000, weight: 26 },
  { min: 5000, max: 6000, weight: 22 },
  { min: 6000, max: 7000, weight: 18 },
  { min: 7000, max: 8000, weight: 14 },
  { min: 8000, max: 9000, weight: 11 },
  { min: 9000, max: 10000, weight: 8 },
  { min: 10000, max: 12000, weight: 6 },
  { min: 12000, max: 14000, weight: 5 },
  { min: 14000, max: 16000, weight: 4 },
  { min: 16000, max: 18000, weight: 3 },
  { min: 18000, max: 20000, weight: 2 },
  { min: 20000, max: 25000, weight: 2 },
  { min: 25000, max: 30000, weight: 1 },
];

function formatCurrency(val?: number): string {
  if (val === undefined || isNaN(val) || val <= 0) return "";
  return val.toLocaleString("pt-BR");
}

function parseCurrencyInput(val: string): number | undefined {
  const digits = val.replace(/\D/g, "");
  if (!digits) return undefined;
  const num = Number(digits);
  return isNaN(num) ? undefined : num;
}

export function PriceRangeHistogramFilter({
  isRent = false,
  minPrice,
  maxPrice,
  onChange,
}: PriceRangeHistogramFilterProps) {
  const buckets = isRent ? RENT_BUCKETS : SALE_BUCKETS;
  const maxLimit = isRent ? 20000 : 5000000;
  const step = isRent ? 100 : 25000;

  // Estados locais dos valores selecionados
  const [sliderMin, setSliderMin] = useState<number>(minPrice || 0);
  const [sliderMax, setSliderMax] = useState<number>(maxPrice || maxLimit);

  // Estados para as caixas de texto editáveis
  const [inputMinText, setInputMinText] = useState<string>(formatCurrency(minPrice));
  const [inputMaxText, setInputMaxText] = useState<string>(formatCurrency(maxPrice));

  // Sincroniza com props externas quando mudarem
  useEffect(() => {
    setSliderMin(minPrice || 0);
    setSliderMax(maxPrice || maxLimit);
    setInputMinText(formatCurrency(minPrice));
    setInputMaxText(formatCurrency(maxPrice));
  }, [minPrice, maxPrice, maxLimit]);

  const maxWeight = useMemo(() => {
    return Math.max(...buckets.map((b) => b.weight), 1);
  }, [buckets]);

  // Aplica o filtro chamando onChange
  const commitChange = (minVal?: number, maxVal?: number) => {
    const finalMin = minVal !== undefined && minVal > 0 ? minVal : undefined;
    const finalMax = maxVal !== undefined && maxVal > 0 && maxVal < maxLimit ? maxVal : undefined;
    onChange({ priceMin: finalMin, priceMax: finalMax });
  };

  // Manipulação dos inputs manuais
  const handleInputMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseCurrencyInput(raw);
    setInputMinText(parsed !== undefined ? parsed.toLocaleString("pt-BR") : "");
    if (parsed !== undefined) {
      setSliderMin(Math.min(parsed, sliderMax));
    } else {
      setSliderMin(0);
    }
  };

  const handleInputMinBlur = () => {
    const parsed = parseCurrencyInput(inputMinText);
    const valid = parsed !== undefined ? Math.min(parsed, sliderMax) : undefined;
    commitChange(valid, sliderMax < maxLimit ? sliderMax : undefined);
  };

  const handleInputMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const parsed = parseCurrencyInput(raw);
    setInputMaxText(parsed !== undefined ? parsed.toLocaleString("pt-BR") : "");
    if (parsed !== undefined) {
      setSliderMax(Math.max(parsed, sliderMin));
    } else {
      setSliderMax(maxLimit);
    }
  };

  const handleInputMaxBlur = () => {
    const parsed = parseCurrencyInput(inputMaxText);
    const valid = parsed !== undefined ? Math.max(parsed, sliderMin) : undefined;
    commitChange(sliderMin > 0 ? sliderMin : undefined, valid);
  };

  // Manipulação dos sliders
  const handleSliderMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.min(val, sliderMax - step);
    setSliderMin(clamped);
    setInputMinText(clamped > 0 ? clamped.toLocaleString("pt-BR") : "");
  };

  const handleSliderMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const clamped = Math.max(val, sliderMin + step);
    setSliderMax(clamped);
    setInputMaxText(clamped < maxLimit ? clamped.toLocaleString("pt-BR") : "");
  };

  const handleSliderCommit = () => {
    commitChange(sliderMin > 0 ? sliderMin : undefined, sliderMax < maxLimit ? sliderMax : undefined);
  };

  // Porcentagens para visual do range ativo
  const minPercent = Math.min(100, Math.max(0, (sliderMin / maxLimit) * 100));
  const maxPercent = Math.min(100, Math.max(0, (sliderMax / maxLimit) * 100));

  return (
    <div className="w-full space-y-3.5 select-none">
      {/* HISTOGRAMA DE VELAS VERTICAIS */}
      <div className="pt-2 px-1">
        <div className="flex items-end justify-between gap-1 h-14 w-full">
          {buckets.map((bucket, idx) => {
            const bucketMid = (bucket.min + bucket.max) / 2;
            const isInside =
              bucketMid >= sliderMin &&
              (sliderMax >= maxLimit ? true : bucketMid <= sliderMax);

            // Altura da vela entre 5px e 52px
            const heightPercent = Math.max(8, Math.round((bucket.weight / maxWeight) * 100));

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                onClick={() => {
                  setSliderMax(bucket.max);
                  setInputMaxText(bucket.max.toLocaleString("pt-BR"));
                  commitChange(sliderMin > 0 ? sliderMin : undefined, bucket.max);
                }}
              >
                {/* TOOLTIP DINÂMICO AO PASSAR O MOUSE */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute bottom-full mb-1.5 z-30 bg-slate-900 text-white text-[10px] font-semibold py-1 px-2 rounded-md shadow-lg whitespace-nowrap">
                  R$ {bucket.min >= 1000000 ? `${(bucket.min / 1000000).toFixed(1)}M` : `${Math.round(bucket.min / 1000)}k`} -{" "}
                  R$ {bucket.max >= 1000000 ? `${(bucket.max / 1000000).toFixed(1)}M` : `${Math.round(bucket.max / 1000)}k`}
                </div>

                {/* VELA VERTICAL */}
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-xs transition-colors duration-150 ${
                    isInside
                      ? "bg-indigo-600 dark:bg-indigo-500 hover:brightness-110"
                      : "bg-slate-200 dark:bg-slate-700/80 hover:bg-slate-300"
                  }`}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* DUAL RANGE SLIDER TRACK */}
      <div className="relative w-full h-5 flex items-center px-1">
        {/* Trilho base cinza */}
        <div className="absolute left-1 right-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full" />

        {/* Barra ativa colorida */}
        <div
          className="absolute h-1.5 bg-indigo-600 dark:bg-indigo-500 rounded-full pointer-events-none"
          style={{
            left: `calc(4px + ${minPercent * 0.94}%)`,
            width: `calc(${Math.max(0, (maxPercent - minPercent) * 0.94)}%)`,
          }}
        />

        {/* Input Min Range */}
        <input
          type="range"
          min={0}
          max={maxLimit}
          step={step}
          value={sliderMin}
          onChange={handleSliderMinChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer z-10 
            [&::-webkit-slider-thumb]:pointer-events-auto 
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-4 
            [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-white 
            [&::-webkit-slider-thumb]:border-2 
            [&::-webkit-slider-thumb]:border-indigo-600 
            [&::-webkit-slider-thumb]:shadow-md 
            [&::-webkit-slider-thumb]:cursor-grab 
            [&::-webkit-slider-thumb]:active:cursor-grabbing 
            [&::-webkit-slider-thumb]:active:scale-110 
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:pointer-events-auto 
            [&::-moz-range-thumb]:w-4 
            [&::-moz-range-thumb]:h-4 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-white 
            [&::-moz-range-thumb]:border-2 
            [&::-moz-range-thumb]:border-indigo-600 
            [&::-moz-range-thumb]:shadow-md"
        />

        {/* Input Max Range */}
        <input
          type="range"
          min={0}
          max={maxLimit}
          step={step}
          value={sliderMax}
          onChange={handleSliderMaxChange}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none cursor-pointer z-20 
            [&::-webkit-slider-thumb]:pointer-events-auto 
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-4 
            [&::-webkit-slider-thumb]:h-4 
            [&::-webkit-slider-thumb]:rounded-full 
            [&::-webkit-slider-thumb]:bg-white 
            [&::-webkit-slider-thumb]:border-2 
            [&::-webkit-slider-thumb]:border-indigo-600 
            [&::-webkit-slider-thumb]:shadow-md 
            [&::-webkit-slider-thumb]:cursor-grab 
            [&::-webkit-slider-thumb]:active:cursor-grabbing 
            [&::-webkit-slider-thumb]:active:scale-110 
            [&::-webkit-slider-thumb]:transition-transform
            [&::-moz-range-thumb]:pointer-events-auto 
            [&::-moz-range-thumb]:w-4 
            [&::-moz-range-thumb]:h-4 
            [&::-moz-range-thumb]:rounded-full 
            [&::-moz-range-thumb]:bg-white 
            [&::-moz-range-thumb]:border-2 
            [&::-moz-range-thumb]:border-indigo-600 
            [&::-moz-range-thumb]:shadow-md"
        />
      </div>

      {/* CAIXAS DE TEXTO PARA DEFINIR MÍNIMO E MÁXIMO */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {/* Mínimo */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Mínimo
          </label>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-semibold text-slate-500">R$</span>
            <input
              type="text"
              value={inputMinText}
              placeholder="0"
              onChange={handleInputMinChange}
              onBlur={handleInputMinBlur}
              onKeyDown={(e) => e.key === "Enter" && handleInputMinBlur()}
              className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none min-w-0"
            />
          </div>
        </div>

        {/* Máximo */}
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Máximo
          </label>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-semibold text-slate-500">R$</span>
            <input
              type="text"
              value={inputMaxText}
              placeholder={sliderMax >= maxLimit ? "Sem limite" : ""}
              onChange={handleInputMaxChange}
              onBlur={handleInputMaxBlur}
              onKeyDown={(e) => e.key === "Enter" && handleInputMaxBlur()}
              className="w-full bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-none min-w-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
