"use server";

import { recordWhatsAppLead, recordFormLead } from "./services";
import type { CreateWhatsAppLeadInput, CreateFormLeadInput, Lead } from "@/types/lead";

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

/**
 * Server Action para enviar mensagem de contato/proposta através de formulário na página do imóvel
 */
export async function submitLeadFormAction(
  input: CreateFormLeadInput
): Promise<TrackLeadResult> {
  try {
    if (!input.propertyId || !input.agencyId) {
      return { success: false, error: "Imóvel e imobiliária são obrigatórios." };
    }
    if (!input.name || input.name.trim().length < 2) {
      return { success: false, error: "Por favor, informe seu nome." };
    }
    if (!input.phone || input.phone.trim().length < 8) {
      return { success: false, error: "Por favor, informe um telefone ou WhatsApp válido." };
    }

    const lead = await recordFormLead(input);
    return { success: true, lead };
  } catch (err: any) {
    console.error("[submitLeadFormAction] Erro ao enviar mensagem:", err);
    return {
      success: false,
      error: err?.message || "Não foi possível enviar a mensagem no momento. Tente via WhatsApp.",
    };
  }
}
