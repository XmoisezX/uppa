/**
 * ConnectorRegistry
 * Gerenciador central de conectores de websites
 * Permite registrar conectores universais e futuros conectores específicos de CRMs
 */

import type { ConnectorContext } from "../types";
import type { WebsiteConnector } from "./connector.interface";
import { UniversalStructuredDataConnector } from "./universal-structured-data-connector";
import { GenericWebsiteConnector } from "./generic-website-connector";
import { JetimobConnector } from "./jetimob-connector";

export class ConnectorRegistry {
  private connectors: Map<string, WebsiteConnector> = new Map();

  constructor() {
    // Registra os conectores padrão
    this.register(new JetimobConnector());
    this.register(new UniversalStructuredDataConnector());
    this.register(new GenericWebsiteConnector());
  }

  public register(connector: WebsiteConnector): void {
    this.connectors.set(connector.id, connector);
  }

  public getConnector(id: string): WebsiteConnector | undefined {
    return this.connectors.get(id);
  }

  /**
   * Localiza o conector mais adequado para o contexto fornecido
   */
  public async resolveConnector(
    context: ConnectorContext,
    preferredConnectorId?: string
  ): Promise<WebsiteConnector> {
    if (preferredConnectorId && this.connectors.has(preferredConnectorId)) {
      return this.connectors.get(preferredConnectorId)!;
    }

    for (const connector of this.connectors.values()) {
      if (await connector.canHandle(context)) {
        return connector;
      }
    }

    // Fallback garantido
    return (
      this.connectors.get("generic_website") ||
      new GenericWebsiteConnector()
    );
  }
}

export const defaultConnectorRegistry = new ConnectorRegistry();
