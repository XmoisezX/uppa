/**
 * Tipos de Localização Geográfica definidos no MASTER_PLAN.md (Seção 7 e 81)
 */

export interface State {
  id: string;
  name: string;
  code: string; // Ex: "RS", "SP"
  ibgeCode: number; // Ex: 43
  slug: string; // Ex: "rio-grande-do-sul"
  createdAt?: string;
  updatedAt?: string;
}

export interface City {
  id: string;
  stateId: string;
  name: string;
  ibgeCode?: number | null; // Código de 7 dígitos do IBGE (Ex: 4314407 para Pelotas)
  slug: string; // Ex: "pelotas"
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Relacionamento expandido
  state?: State;
}

export interface Neighborhood {
  id: string;
  cityId: string;
  name: string;
  slug: string; // Ex: "laranjal"
  latitude?: number | null;
  longitude?: number | null;
  createdAt?: string;
  updatedAt?: string;
  // Relacionamento expandido
  city?: City;
}

export interface GeographicHierarchy {
  state: State;
  city?: City;
  neighborhood?: Neighborhood;
}

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}
