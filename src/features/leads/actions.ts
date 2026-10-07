"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  recordWhatsAppLead,
  recordFormLead,
  updateLeadStatus,
  addLeadNote,
  processPendingLeadDeliveriesBatch,
} from "./services";
import type {
  CreateWhatsAppLeadInput,
  CreateFormLeadInput,
  Lead,
  LeadStatus,
} from "@/types/lead";

export interface TrackLeadResult {
  success: boolean;
  lead?: Lead;
  error?: string;
}

/**
 * Server Action para registrar clique no WhatsApp na página do imóvel (Seções 22 e 30)
 */
export async function trackWhatsAppLeadAction(
  input: CreateWhatsAppLeadInput
): Promise<TrackLeadResult> {
  try {
    if (!input.propertyId || !input.agencyId) {
      return { success: false, error: "propertyId e agencyId são obrigatórios." };
    }

    const lead = await recordWhatsAppLead(input);
    revalidatePath("/painel/leads");
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
 * Server Action para enviar mensagem de interesse através de formulário (Seções 22 e 31)
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
    revalidatePath("/painel/leads");
    return { success: true, lead };
  } catch (err: any) {
    console.error("[submitLeadFormAction] Erro ao enviar mensagem:", err);
    return {
      success: false,
      error: err?.message || "Não foi possível enviar a mensagem no momento. Tente via WhatsApp.",
    };
  }
}

/**
 * Server Action para atualizar o status comercial de um lead pelo corretor/gestor (Seção 35)
 */
export async function updateLeadStatusAction(input: {
  leadId: string;
  status: LeadStatus;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const actorName = user?.user_metadata?.full_name || "Membro da Imobiliária";
    const res = await updateLeadStatus(input.leadId, input.status, actorName);

    if (res.success) {
      revalidatePath("/painel/leads");
    }

    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao atualizar status." };
  }
}

/**
 * Server Action para adicionar uma anotação interna à timeline do lead (Seção 36)
 */
export async function addLeadNoteAction(input: {
  leadId: string;
  content: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!input.content || !input.content.trim()) {
      return { success: false, error: "O conteúdo da anotação não pode estar vazio." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const authorName = user?.user_metadata?.full_name || "Membro da Imobiliária";
    const res = await addLeadNote(input.leadId, input.content.trim(), authorName, user?.id || null);

    if (res.success) {
      revalidatePath("/painel/leads");
    }

    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || "Erro ao registrar anotação." };
  }
}

/**
 * Server Action para processar retentativas em lote de despachos pendentes/falhos (Seção 42)
 */
export async function processLeadRetriesAction(): Promise<{
  processed: number;
  retried: number;
}> {
  try {
    return await processPendingLeadDeliveriesBatch(20);
  } catch (err) {
    console.error("[processLeadRetriesAction] Erro no processamento de retries:", err);
    return { processed: 0, retried: 0 };
  }
}
