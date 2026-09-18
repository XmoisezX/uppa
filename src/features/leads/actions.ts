"use server";

import { recordWhatsAppLead } from "./services";
import type { CreateWhatsAppLeadInput, Lead } from "@/types/lead";

export interface TrackLeadResult {
  success: boolean;
  lead?: Lead;
  error?: string;
}

/**
 * Server Action para registrar clique no WhatsApp na página do imóvel
 * Garante que falhas ou exceções sejam capturadas sem quebrar o fluxo do usuário
 */
export async function trackWhatsAppLeadAction(
  input: CreateWhatsAppLeadInput
): Promise<TrackLeadResult> {
  try {
    if (!input.propertyId || !input.agencyId) {
      return { success: false, error: "propertyId e agencyId são obrigatórios." };
    }

    const lead = await recordWhatsAppLead(input);
    return { success: true, lead };
  } catch (err: any) {
    console.error("[trackWhatsAppLeadAction] Erro ao registrar lead:", err);
    return {
      success: false,
      error: err?.message || "Erro inesperado ao registrar lead",
    };
  }
}
