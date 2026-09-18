import React from "react";

interface PropertyDescriptionProps {
  description?: string | null;
}

export function PropertyDescription({ description }: PropertyDescriptionProps) {
  if (!description || description.trim() === "") {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">
          Descrição do Imóvel
        </h2>
        <p className="text-sm text-slate-500 italic">
          O anunciante não forneceu uma descrição textual detalhada para este imóvel. Entre em contato para obter mais detalhes.
        </p>
      </div>
    );
  }

  // Divide o texto por quebras de linha para manter a diagramação original
  const paragraphs = description.split("\n").filter((p) => p.trim() !== "");

  return (
    <div className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Sobre este Imóvel
      </h2>

      <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
        {paragraphs.map((para, index) => (
          <p key={index}>{para}</p>
        ))}
      </div>
    </div>
  );
}
