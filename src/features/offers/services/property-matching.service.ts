/**
 * PropertyMatchingService
 * 
 * Responsável pela identificação de duplicidades físicas entre imóveis (Fase 2, 6, 7 e 22).
 * Combina múltiplos sinais (endereço, número, complemento, coordenadas geográficas,
 * tipo de imóvel, áreas, cômodos, vagas) calculando score de confiança determinístico.
 * 
 * Regra de Ouro: NA DÚVIDA -> NÃO AGRUPAR.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

export interface PropertyPhysicalProfile {
  id: string;
  slug: string;
  title: string;
  propertyType: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  zipcode: string | null;
  neighborhoodId: string | null;
  cityId: string | null;
  stateId: string | null;
  latitude: number | null;
  longitude: number | null;
  usableArea: number | null;
  totalArea: number | null;
  lotArea: number | null;
  bedrooms: number;
  suites: number;
  bathrooms: number;
  parkingSpaces: number;
  createdAt: string;
  agencyId?: string;
  activeOffersCount?: number;
}

export interface MatchSignalBreakdown {
  addressScore: number;
  numberMatch: boolean;
  unitMatch: boolean | null;
  distanceMeters: number | null;
  geoScore: number;
  typeMatch: boolean;
  areaDiffPercentage: number | null;
  areaScore: number;
  roomsScore: number;
  reasons: string[];
}

export type MatchConfidence = "HIGH" | "MEDIUM" | "LOW";

export interface PropertyMatchResult {
  propertyAId: string;
  propertyBId: string;
  score: number; // 0 a 100
  confidence: MatchConfidence;
  signals: MatchSignalBreakdown;
  recommendation: "auto_merge" | "review_candidate" | "keep_separate";
}

export class PropertyMatchingService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Normaliza texto de endereço para comparação fonética/textual
   */
  public normalizeAddressText(text?: string | null): string {
    if (!text) return "";
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(rua|avenida|av|alameda|al|travessa|trv|praca|pc|rodovia|rod)\b/gi, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Normaliza complemento / unidade (ex: "Apto 42", "Ap 42", "42B")
   */
  public normalizeUnit(unit?: string | null): string {
    if (!unit) return "";
    return unit
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\b(apartamento|apto|ap|bloco|bl|unidade|un|casa|cj|sala)\b/gi, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();
  }

  /**
   * Calcula distância geodésica em metros (Fórmula de Haversine)
   */
  public calculateDistanceMeters(
    lat1?: number | null,
    lon1?: number | null,
    lat2?: number | null,
    lon2?: number | null
  ): number | null {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
    if (lat1 === 0 && lon1 === 0) return null;
    if (lat2 === 0 && lon2 === 0) return null;

    const R = 6371e3; // Raio da Terra em metros
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }

  /**
   * Avalia a similaridade física entre dois perfis de propriedades
   */
  public evaluateMatch(
    propA: PropertyPhysicalProfile,
    propB: PropertyPhysicalProfile
  ): PropertyMatchResult {
    // 1. Não pode agrupar imóvel consigo mesmo
    if (propA.id === propB.id) {
      return {
        propertyAId: propA.id,
        propertyBId: propB.id,
        score: 0,
        confidence: "LOW",
        signals: {
          addressScore: 0,
          numberMatch: false,
          unitMatch: null,
          distanceMeters: null,
          geoScore: 0,
          typeMatch: false,
          areaDiffPercentage: null,
          areaScore: 0,
          roomsScore: 0,
          reasons: ["Mesmo identificador de imóvel"],
        },
        recommendation: "keep_separate",
      };
    }

    // 2. Não agrupa se forem de cidades diferentes
    if (propA.cityId && propB.cityId && propA.cityId !== propB.cityId) {
      return {
        propertyAId: propA.id,
        propertyBId: propB.id,
        score: 0,
        confidence: "LOW",
        signals: {
          addressScore: 0,
          numberMatch: false,
          unitMatch: null,
          distanceMeters: null,
          geoScore: 0,
          typeMatch: false,
          areaDiffPercentage: null,
          areaScore: 0,
          roomsScore: 0,
          reasons: ["Cidades distintas"],
        },
        recommendation: "keep_separate",
      };
    }

    // 3. Tipologia do Imóvel (Apartamento vs Casa não são o mesmo imóvel)
    const typeMatch = propA.propertyType === propB.propertyType;
    if (!typeMatch) {
      return {
        propertyAId: propA.id,
        propertyBId: propB.id,
        score: 0,
        confidence: "LOW",
        signals: {
          addressScore: 0,
          numberMatch: false,
          unitMatch: null,
          distanceMeters: null,
          geoScore: 0,
          typeMatch: false,
          areaDiffPercentage: null,
          areaScore: 0,
          roomsScore: 0,
          reasons: ["Tipologias físicas incompatíveis"],
        },
        recommendation: "keep_separate",
      };
    }

    const reasons: string[] = [];
    let totalScore = 0;

    // --- SINAL 1: ENDEREÇO E NÚMERO ---
    const normStreetA = this.normalizeAddressText(propA.street);
    const normStreetB = this.normalizeAddressText(propB.street);
    let addressScore = 0;
    if (normStreetA && normStreetB && (normStreetA.includes(normStreetB) || normStreetB.includes(normStreetA))) {
      addressScore = 20;
      reasons.push("Logradouro coincidente");
    }

    const cleanNumA = (propA.number || "").trim().toLowerCase();
    const cleanNumB = (propB.number || "").trim().toLowerCase();
    const numberMatch = Boolean(cleanNumA && cleanNumB && cleanNumA === cleanNumB);
    if (numberMatch) {
      addressScore += 20;
      reasons.push(`Mesmo número predial (${cleanNumA})`);
    } else if (cleanNumA && cleanNumB && cleanNumA !== cleanNumB) {
      // Números prediais diferentes e definidos = edifícios/casas diferentes
      reasons.push(`Números prediais divergentes (${cleanNumA} vs ${cleanNumB})`);
      return {
        propertyAId: propA.id,
        propertyBId: propB.id,
        score: 10,
        confidence: "LOW",
        signals: {
          addressScore: 10,
          numberMatch: false,
          unitMatch: null,
          distanceMeters: null,
          geoScore: 0,
          typeMatch: true,
          areaDiffPercentage: null,
          areaScore: 0,
          roomsScore: 0,
          reasons,
        },
        recommendation: "keep_separate",
      };
    }

    totalScore += addressScore;

    // --- SINAL 2: UNIDADE / COMPLEMENTO ---
    const unitA = this.normalizeUnit(propA.complement);
    const unitB = this.normalizeUnit(propB.complement);
    let unitMatch: boolean | null = null;
    if (unitA && unitB) {
      unitMatch = unitA === unitB;
      if (unitMatch) {
        totalScore += 25;
        reasons.push(`Mesma unidade/complemento (${unitA})`);
      } else {
        // Unidades declaradas diferentes (ex: Apto 101 vs Apto 102 no mesmo prédio)
        reasons.push(`Unidades diferentes no mesmo prédio (${unitA} vs ${unitB})`);
        return {
          propertyAId: propA.id,
          propertyBId: propB.id,
          score: 35,
          confidence: "LOW",
          signals: {
            addressScore,
            numberMatch,
            unitMatch: false,
            distanceMeters: null,
            geoScore: 0,
            typeMatch: true,
            areaDiffPercentage: null,
            areaScore: 0,
            roomsScore: 0,
            reasons,
          },
          recommendation: "keep_separate",
        };
      }
    }

    // --- SINAL 3: GEOLOCALIZAÇÃO ---
    const distanceMeters = this.calculateDistanceMeters(
      propA.latitude,
      propA.longitude,
      propB.latitude,
      propB.longitude
    );
    let geoScore = 0;
    if (distanceMeters != null) {
      if (distanceMeters <= 30) {
        geoScore = 15;
        reasons.push(`Coordenadas geográficas muito próximas (${distanceMeters}m)`);
      } else if (distanceMeters <= 100) {
        geoScore = 10;
        reasons.push(`Coordenadas geográficas próximas (${distanceMeters}m)`);
      } else if (distanceMeters > 500 && numberMatch) {
        // Alerta de divergência nas coordenadas apesar do mesmo número
        reasons.push(`Coordenadas afastadas (${distanceMeters}m)`);
      }
    }
    totalScore += geoScore;

    // --- SINAL 4: ÁREA PRIVATIVA / ÚTIL ---
    let areaDiffPercentage: number | null = null;
    let areaScore = 0;
    const areaA = propA.usableArea || propA.totalArea;
    const areaB = propB.usableArea || propB.totalArea;

    if (areaA && areaB && areaA > 0 && areaB > 0) {
      areaDiffPercentage = Math.round((Math.abs(areaA - areaB) / Math.max(areaA, areaB)) * 100);
      if (areaDiffPercentage <= 2) {
        areaScore = 15;
        reasons.push(`Metragem praticamente idêntica (${areaA}m² vs ${areaB}m²)`);
      } else if (areaDiffPercentage <= 6) {
        areaScore = 10;
        reasons.push(`Metragem muito similar (${areaA}m² vs ${areaB}m² - dif: ${areaDiffPercentage}%)`);
      } else if (areaDiffPercentage > 20) {
        // Áreas muito diferentes (ex: 70m² vs 120m²) = quase certamente imóveis distintos
        reasons.push(`Área substancialmente divergente (${areaA}m² vs ${areaB}m²)`);
        totalScore -= 20;
      }
    }
    totalScore += areaScore;

    // --- SINAL 5: ESPECIFICAÇÕES FÍSICAS (Quartos, Suítes, Banheiros, Vagas) ---
    let roomsScore = 0;
    const bedroomsMatch = propA.bedrooms === propB.bedrooms && propA.bedrooms > 0;
    const suitesMatch = propA.suites === propB.suites;
    const bathroomsMatch = propA.bathrooms === propB.bathrooms && propA.bathrooms > 0;
    const parkingMatch = propA.parkingSpaces === propB.parkingSpaces;

    if (bedroomsMatch) {
      roomsScore += 5;
      reasons.push(`Mesmo número de quartos (${propA.bedrooms})`);
    } else if (Math.abs(propA.bedrooms - propB.bedrooms) >= 2) {
      reasons.push(`Quartos muito divergentes (${propA.bedrooms} vs ${propB.bedrooms})`);
      totalScore -= 15;
    }

    if (parkingMatch) {
      roomsScore += 3;
    }
    if (suitesMatch && propA.suites > 0) {
      roomsScore += 2;
    }
    totalScore += roomsScore;

    // Normaliza score final entre 0 e 100
    const finalScore = Math.max(0, Math.min(100, totalScore));

    // --- CLASSIFICAÇÃO DE CONFIANÇA (Fase 2) ---
    // HIGH: Mesma rua + mesmo número + (mesma unidade OU área exata com quartos iguais e coords próximas)
    let confidence: MatchConfidence = "LOW";
    let recommendation: "auto_merge" | "review_candidate" | "keep_separate" = "keep_separate";

    const isStrongAddress = normStreetA.length > 5 && normStreetB.length > 5 && numberMatch;
    const isAreaClose = areaDiffPercentage !== null && areaDiffPercentage <= 5;

    if (finalScore >= 80 && isStrongAddress && (unitMatch === true || (isAreaClose && bedroomsMatch))) {
      confidence = "HIGH";
      recommendation = "auto_merge";
    } else if (finalScore >= 55 && (numberMatch || (distanceMeters != null && distanceMeters <= 50))) {
      confidence = "MEDIUM";
      recommendation = "review_candidate";
    } else {
      confidence = "LOW";
      recommendation = "keep_separate";
    }

    return {
      propertyAId: propA.id,
      propertyBId: propB.id,
      score: finalScore,
      confidence,
      signals: {
        addressScore,
        numberMatch,
        unitMatch,
        distanceMeters,
        geoScore,
        typeMatch,
        areaDiffPercentage,
        areaScore,
        roomsScore,
        reasons,
      },
      recommendation,
    };
  }

  /**
   * Escolhe a propriedade canônica entre duas properties de forma determinística (Fase 6)
   * Critérios:
   * 1. Maior número de ofertas ativas
   * 2. Maior completude de dados físicos
   * 3. Coordenadas geográficas válidas
   * 4. Registro mais antigo (created_at ASC)
   */
  public selectCanonicalProperty(
    propA: PropertyPhysicalProfile,
    propB: PropertyPhysicalProfile
  ): { canonical: PropertyPhysicalProfile; duplicate: PropertyPhysicalProfile } {
    let scoreA = 0;
    let scoreB = 0;

    // Completude de endereço
    if (propA.street && propA.number) scoreA += 10;
    if (propB.street && propB.number) scoreB += 10;
    if (propA.complement) scoreA += 5;
    if (propB.complement) scoreB += 5;

    // Coordenadas
    if (propA.latitude && propA.longitude) scoreA += 10;
    if (propB.latitude && propB.longitude) scoreB += 10;

    // Atributos físicos
    if (propA.usableArea) scoreA += 5;
    if (propB.usableArea) scoreB += 5;
    if (propA.bedrooms > 0) scoreA += 3;
    if (propB.bedrooms > 0) scoreB += 3;
    if (propA.bathrooms > 0) scoreA += 2;
    if (propB.bathrooms > 0) scoreB += 2;

    if (scoreA > scoreB) return { canonical: propA, duplicate: propB };
    if (scoreB > scoreA) return { canonical: propB, duplicate: propA };

    // Desempate determinístico: data de criação mais antiga
    const dateA = new Date(propA.createdAt).getTime();
    const dateB = new Date(propB.createdAt).getTime();

    if (dateA <= dateB) {
      return { canonical: propA, duplicate: propB };
    } else {
      return { canonical: propB, duplicate: propA };
    }
  }
}
