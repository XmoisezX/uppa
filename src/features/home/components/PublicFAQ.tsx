"use client";

import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "O que é a UPPA?",
    answer:
      "A UPPA é um portal imobiliário nacional que reúne anúncios de venda e locação em várias cidades do Brasil. Nossa missão é oferecer uma experiência de busca rápida, limpa e transparente, conectando compradores e locatários diretamente aos anunciantes profissionais.",
  },
  {
    question: "A UPPA é uma imobiliária?",
    answer:
      "Não. A UPPA não é imobiliária, não comercializa imóveis próprios e não cobra comissões sobre as negociações. Somos uma plataforma de tecnologia e mídia imobiliária focada em facilitar a busca e a distribuição de anúncios.",
  },
  {
    question: "Como encontrar um imóvel?",
    answer:
      "Utilize a busca principal na parte superior da página selecionando entre Comprar e Alugar, o tipo de imóvel (como apartamento ou casa) e a localização desejada. Você também pode refinar os resultados por faixa de preço, dormitórios, vagas e condições como financiamento bancário.",
  },
  {
    question: "Como entrar em contato com uma imobiliária?",
    answer:
      "Ao abrir a página de qualquer imóvel de seu interesse, você visualiza os dados da imobiliária ou corretor parceiro e pode clicar para iniciar contato imediato via WhatsApp ou preencher o formulário para receber retorno por e-mail ou telefone.",
  },
  {
    question: "Como anunciar imóveis na UPPA?",
    answer:
      "Imobiliárias e corretores credenciados podem se cadastrar pelo menu 'Anuncie'. A plataforma oferece suporte tanto para cadastro manual quanto para sincronização automatizada via integração de feed XML.",
  },
  {
    question: "Os anúncios são publicados por quem?",
    answer:
      "Os imóveis são cadastrados e mantidos por imobiliárias e corretores parceiros, que são os responsáveis pelas informações, fotos, disponibilidade e valores informados em cada anúncio.",
  },
];

export function PublicFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-14 sm:py-18 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 mb-3">
            <HelpCircle className="h-5 w-5" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Perguntas Frequentes
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Tire suas dúvidas sobre o funcionamento do portal UPPA
          </p>
        </div>

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.question}
                className="rounded-xl border border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="pr-4">{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : ""
                    }`}
                  />
                </button>

                {isOpen && (
                  <div className="px-4 pb-5 sm:px-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
