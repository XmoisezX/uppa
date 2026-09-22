import React from "react";
import Link from "next/link";
import { BookOpen, ArrowRight, ShieldCheck, Calculator, Key, Home } from "lucide-react";

export function HomeEditorialSection() {
  const articles = [
    {
      title: "Guia Completo para Comprar seu Imóvel",
      description: "Do planejamento financeiro à escritura: veja o passo a passo para fazer uma compra segura e sem surpresas.",
      category: "Compra & Venda",
      icon: Home,
      readTime: "4 min de leitura",
      href: "/#faq",
    },
    {
      title: "Locação Transparente: Direitos e Deveres",
      description: "Entenda como funcionam vistorias de entrada, garantias locatícias e reajustes contratuais de aluguel.",
      category: "Aluguel",
      icon: Key,
      readTime: "3 min de leitura",
      href: "/#faq",
    },
    {
      title: "Como Funciona o Financiamento Habitacional",
      description: "Descubra como calcular o valor da entrada, o uso do FGTS e a diferença entre tabelas SAC e Price.",
      category: "Finanças",
      icon: Calculator,
      readTime: "5 min de leitura",
      href: "/#faq",
    },
    {
      title: "Documentação e Certidões Necessárias",
      description: "A lista indispensável de certidões do imóvel e dos vendedores para fechar negócio com total tranquilidade.",
      category: "Segurança Jurídica",
      icon: ShieldCheck,
      readTime: "4 min de leitura",
      href: "/#faq",
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-slate-50/70 dark:bg-slate-900/30 border-b border-slate-200/80 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Guias & Conhecimento</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Conteúdo & Dicas Imobiliárias
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Informações práticas preparadas para orientar compradores, locatários e proprietários
            </p>
          </div>
          <Link
            href="/#faq"
            className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 flex items-center gap-1 self-start sm:self-auto"
          >
            Ver perguntas frequentes
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {articles.map((art) => {
            const Icon = art.icon;
            return (
              <div
                key={art.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition-all dark:border-slate-800 dark:bg-slate-900"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {art.readTime}
                    </span>
                  </div>

                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1.5">
                    {art.category}
                  </span>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {art.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {art.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={art.href}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                  >
                    <span>Ler orientações</span>
                    <ArrowRight className="h-3 w-3" />
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
