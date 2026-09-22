import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Home } from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";

export default function NotFound() {
  return (
    <PortalShell>
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 shadow-sm dark:bg-indigo-950/50 dark:text-indigo-400">
          <span className="text-3xl font-extrabold">404</span>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl dark:text-white">
          Página não encontrada
        </h1>

        <p className="mt-3 max-w-md text-base text-slate-600 dark:text-slate-400">
          O endereço que você procurou não existe, foi alterado ou não está mais
          disponível no momento.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
              <Home className="h-4 w-4" />
              Ir para Página Inicial
            </Button>
          </Link>
          <Link href="/comprar">
            <Button variant="outline" className="gap-2">
              <Search className="h-4 w-4" />
              Explorar Imóveis
            </Button>
          </Link>
        </div>
      </div>
    </PortalShell>
  );
}
