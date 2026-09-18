"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PropertiesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro no módulo de imóveis:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center dark:border-red-900/30 dark:bg-red-950/20">
        <div className="h-12 w-12 mx-auto rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Ocorreu um erro ao carregar os imóveis
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {error.message || "Falha na comunicação com o banco de dados. Tente novamente."}
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            onClick={() => reset()}
            variant="outline"
            className="cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Tentar Novamente
          </Button>

          <Link href="/painel">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar ao Painel
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
