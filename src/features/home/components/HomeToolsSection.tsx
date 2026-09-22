import React from "react";
import Link from "next/link";
import { Calculator, Map, Building2, ArrowRight } from "lucide-react";

export function HomeToolsSection() {
  const tools = [
    {
      title: "Simulação de Financiamento",
      description: "Planeje a compra do seu imóvel estimando parcelas, valor de entrada e condições de crédito com dados reais de mercado.",
      icon: Calculator,
      cta: "Explorar imóveis financiáveis",
      href: "/comprar?financiable=true",
    },
    {
      title: "Busca Geográfica por Mapa",
      description: "Navegue pelo mapa interativo para encontrar casas e apartamentos exatamente no quadrante ou bairro de sua preferência.",
      icon: Map,
      cta: "Abrir mapa de imóveis",
      href: "/comprar",
    },
    {
      title: "Publicação Direta para Imobiliárias",
      description: "Integração automática por XML/VRSync ou cadastro descomplicado com geração de contatos diretos no WhatsApp.",
      icon: Building2,
      cta: "Cadastrar minha carteira",
      href: "/cadastrar",
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-white dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Facilidades da UPPA
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Ferramentas & Serviços para sua Jornada
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Recursos inteligentes pensados para simplificar a busca, a escolha e a negociação imobiliária
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <div
                key={tool.title}
                className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 flex flex-col justify-between hover:bg-white hover:border-slate-300 hover:shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900/50 dark:hover:bg-slate-900"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20 mb-5">
                    <Icon className="h-6 w-6" />
                  </div>

                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {tool.title}
                  </h3>

                  <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800">
                  <Link
                    href={tool.href}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <span>{tool.cta}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
