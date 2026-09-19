import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Building2, CheckCircle2, ArrowRight } from "lucide-react";

export function AgencyCTA() {
  return (
    <section className="py-14 sm:py-18 bg-slate-900 text-white border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/30 text-indigo-400 mb-4 ring-1 ring-indigo-500/30">
            <Building2 className="h-6 w-6" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            É imobiliária ou corretor de imóveis?
          </h2>

          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
            Publique seus anúncios na UPPA e receba contatos diretos de compradores
            e locatários. Aumente a visibilidade da sua carteira com publicação
            descomplicada.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Integração de imóveis por XML/feed</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Leads enviados direto ao seu WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Painel completo de gestão</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/cadastrar" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md"
              >
                Cadastrar Imobiliária
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <Link href="/entrar" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-800 hover:text-white font-semibold text-sm"
              >
                Acessar Painel
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
