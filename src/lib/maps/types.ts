/**
 * Abstração de Mapas conforme especificado na Seção 4 do MASTER_PLAN.md
 * NUNCA utilizar funções diretas de fornecedores em toda a aplicação.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Address {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  country?: string;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  city: string;
  state: string;
  coordinates: Coordinates;
}

export interface MapProvider {
  geocode(address: string): Promise<Coordinates>;
  reverseGeocode(lat: number, lng: number): Promise<Address>;
  autocomplete(query: string): Promise<LocationSuggestion[]>;
}
