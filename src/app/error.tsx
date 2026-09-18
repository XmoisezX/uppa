"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log do erro para observabilidade futura (ex: Sentry)
    console.error("Erro capturado pela fronteira de erro:", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm dark:bg-red-950/50 dark:text-red-400">
        <AlertCircle className="h-8 w-8" />
      </div>

      <h1 className="mt-6 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
        Ocorreu um problema inesperado
      </h1>

      <p className="mt-3 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Não se preocupe, nosso sistema já registrou a ocorrência. Você pode
        tentar recarregar a página ou retornar à página inicial.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs font-mono text-slate-400">
          Código de referência: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={() => reset()} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
          <RefreshCw className="h-4 w-4" />
          Tentar novamente
        </Button>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Voltar ao Início
          </Button>
        </Link>
      </div>
    </div>
  );
}
