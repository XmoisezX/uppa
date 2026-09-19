import type { TransactionType } from "@/types/property";

/**
 * Formata valores para os marcadores (Pins) do mapa imobiliário.
 * Regras:
 * - Venda >= 1.000.000: "R$ 1,2 mi", "R$ 3,5 mi"
 * - Venda >= 1.000: "R$ 320 mil", "R$ 750 mil"
 * - Aluguel: "R$ 2.500"
 * - Sem preço: "Consulte"
 */
export function formatPricePin(
  price?: number | null,
  rentPrice?: number | null,
  transactionType?: TransactionType
): string {
  const isRent = transactionType === "rent";
  const val = isRent ? rentPrice : price;

  if (val === undefined || val === null || val <= 0) {
    return "Consulte";
  }

  // Formato para Aluguel
  if (isRent) {
    if (val >= 1000) {
      const formatted = new Intl.NumberFormat("pt-BR", {
        maximumFractionDigits: 0,
      }).format(val);
      return `R$ ${formatted}`;
    }
    return `R$ ${val}`;
  }

  // Formato para Venda
  if (val >= 1000000) {
    const mi = val / 1000000;
    // Se for inteiro (ex: 2.0 mi -> 2 mi), senão 1 casa decimal (ex: 1,2 mi)
    const formatted = mi.toFixed(1).replace(/\.0$/, "").replace(".", ",");
    return `R$ ${formatted} mi`;
  }

  if (val >= 1000) {
    const mil = Math.round(val / 1000);
    return `R$ ${mil} mil`;
  }

  return `R$ ${val}`;
}

/**
 * Função utilitária para aproximar deterministicamente coordenadas
 * quando address_visible = false (Privacidade do anunciante - Seção 44)
 */
export function getApproximateCoordinates(
  id: string,
  latitude: number,
  longitude: number
): { latitude: number; longitude: number } {
  // Gera hash estável do ID
  let hash1 = 0;
  let hash2 = 0;
  for (let i = 0; i < id.length; i++) {
    const code = id.charCodeAt(i);
    if (i % 2 === 0) {
      hash1 = (hash1 * 31 + code) & 0xffff;
    } else {
      hash2 = (hash2 * 31 + code) & 0xffff;
    }
  }

  // Deslocamento determinístico sutil de até ~250m
  const offsetLat = ((hash1 % 100) - 50) * 0.00005;
  const offsetLng = ((hash2 % 100) - 50) * 0.00005;

  // Arredonda para 2 casas decimais (~1.1 km) e aplica o offset determinístico
  const approxLat = Math.round(latitude * 100) / 100 + offsetLat;
  const approxLng = Math.round(longitude * 100) / 100 + offsetLng;

  return {
    latitude: approxLat,
    longitude: approxLng,
  };
}
