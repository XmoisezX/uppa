/**
 * Interface Base de Conectores de Website
 * Conforme MASTER_PLAN.md e arquitetura modular de conectores
 */

import type { NormalizedProperty } from "@/types/feed";
import type { ConnectorContext, ListingReference } from "../types";

export interface WebsiteConnector {
  /**
   * Identificador único do conector (ex: "universal_structured_data", "generic_website")
   */
  readonly id: string;

  /**
   * Nome legível do conector
   */
  readonly name: string;

  /**
   * Avalia se este conector é capaz de processar o site com base no contexto detectado
   */
  canHandle(context: ConnectorContext): Promise<boolean>;

  /**
   * Descobre todas as URLs de anúncios individuais disponíveis no site (via sitemaps ou paginação)
   */
  discoverListings(context: ConnectorContext): Promise<ListingReference[]>;

  /**
   * Faz o download e parsing de um anúncio individual, convertendo-o estritamente em NormalizedProperty
   */
  fetchListing(
    reference: ListingReference,
    context: ConnectorContext
  ): Promise<NormalizedProperty>;
}
