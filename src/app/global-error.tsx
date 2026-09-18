"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro crítico na raiz da aplicação:", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4 text-slate-800 font-sans">
        <div className="max-w-md w-full rounded-2xl bg-white p-8 text-center shadow-lg">
          <h2 className="text-2xl font-bold text-slate-900">Erro no Sistema</h2>
          <p className="mt-2 text-sm text-slate-600">
            Ocorreu uma falha grave de carregamento. Por favor, tente recarregar a
            página.
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none"
          >
            Recarregar aplicação
          </button>
        </div>
      </body>
    </html>
  );
}
