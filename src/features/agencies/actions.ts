"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAgency, updateAgency, submitAgencyClaim, submitAgencyProfileRequest, reviewAgencyClaim } from "./services";
import { createAgencySchema } from "@/lib/validations/agency";

export interface AgencyActionResult {
  success?: boolean;
  error?: string;
  agencyId?: string;
}

/**
 * Server action para criação de imobiliária pelo usuário autenticado
 */
export async function createAgencyAction(
  prevState: AgencyActionResult | null,
  formData: FormData
): Promise<AgencyActionResult> {
  try {
    const rawData = {
      name: formData.get("name") as string,
      slug: formData.get("slug") as string,
      legalName: (formData.get("legalName") as string) || undefined,
      document: (formData.get("document") as string) || undefined,
      creci: formData.get("creci") as string,
      phone: (formData.get("phone") as string) || undefined,
      whatsapp: formData.get("whatsapp") as string,
      email: formData.get("email") as string,
      website: (formData.get("website") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
      cityId: (formData.get("cityId") as string) || undefined,
    };

    const validated = createAgencySchema.safeParse(rawData);

    if (!validated.success) {
      const firstError = validated.error.issues[0]?.message || "Dados inválidos.";
      return { error: firstError };
    }

    const agency = await createAgency(validated.data);
    revalidatePath("/painel", "layout");
    return { success: true, agencyId: agency.id };
  } catch (err: any) {
    return { error: err?.message || "Erro inesperado ao cadastrar imobiliária." };
  }
}

/**
 * Server action para atualização cadastral da imobiliária
 */
export async function updateAgencyAction(
  prevState: AgencyActionResult | null,
  formData: FormData
): Promise<AgencyActionResult> {
  try {
    const agencyId = formData.get("agencyId") as string;
    if (!agencyId) {
      return { error: "ID da imobiliária não informado." };
    }

    const rawData = {
      name: formData.get("name") as string,
      legalName: (formData.get("legalName") as string) || undefined,
      document: (formData.get("document") as string) || undefined,
      creci: formData.get("creci") as string,
      phone: (formData.get("phone") as string) || undefined,
      whatsapp: formData.get("whatsapp") as string,
      email: formData.get("email") as string,
      website: (formData.get("website") as string) || undefined,
      description: (formData.get("description") as string) || undefined,
    };

    await updateAgency(agencyId, rawData);
    revalidatePath("/painel", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erro ao atualizar dados da imobiliária." };
  }
}

/**
 * Server action para atualizar o perfil do corretor / membro da imobiliária
 */
export async function updateAgencyUserProfileAction(data: {
  fullName: string;
  phone?: string;
  creci?: string;
  bio?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Usuário não autenticado." };
    }

    if (!data.fullName || data.fullName.trim().length === 0) {
      return { error: "O nome completo é obrigatório." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: data.fullName.trim(),
        phone: data.phone?.trim() || null,
        creci: data.creci?.trim() || null,
        bio: data.bio?.trim() || null,
      },
    });

    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/painel/perfil");
    revalidatePath("/painel", "layout");
    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erro ao atualizar dados do perfil." };
  }
}

/**
 * Server action para alteração de senha do corretor / imobiliária
 */
export async function updateAgencyUserPasswordAction(newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { error: "A nova senha deve ter no mínimo 6 caracteres." };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Usuário não autenticado." };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err?.message || "Erro ao atualizar senha." };
  }
}

/**
 * Server action para envio de solicitação de reivindicação (Claim) de imobiliária
 */
export async function submitAgencyClaimAction(input: {
  agencyId: string;
  applicantName: string;
  applicantRole: string;
  phone: string;
  professionalEmail: string;
  documentNumber?: string;
  message?: string;
  agencySlug?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        error: "AUTH_REQUIRED",
        message: "É necessário entrar na sua conta para reivindicar este perfil.",
      };
    }

    if (!input.applicantName?.trim() || !input.applicantRole?.trim() || !input.phone?.trim() || !input.professionalEmail?.trim()) {
      return { error: "VALIDATION_ERROR", message: "Preencha todos os campos obrigatórios." };
    }

    const result = await submitAgencyClaim(
      {
        agencyId: input.agencyId,
        applicantName: input.applicantName,
        applicantRole: input.applicantRole,
        phone: input.phone,
        professionalEmail: input.professionalEmail,
        documentNumber: input.documentNumber,
        message: input.message,
      },
      user.id
    );

    if (input.agencySlug) {
      revalidatePath(`/imobiliaria/${input.agencySlug}`);
    }
    revalidatePath("/admin/claims");

    return result;
  } catch (err: any) {
    return { error: "SERVER_ERROR", message: err?.message || "Erro ao processar reivindicação." };
  }
}

/**
 * Server action para solicitação de correção ou remoção de perfil
 */
export async function submitAgencyProfileRequestAction(input: {
  agencyId: string;
  type: "correction" | "removal";
  applicantName: string;
  contactEmail: string;
  phone?: string;
  description: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!input.applicantName?.trim() || !input.contactEmail?.trim() || !input.description?.trim()) {
      return { error: "VALIDATION_ERROR", message: "Preencha os campos obrigatórios." };
    }

    const result = await submitAgencyProfileRequest(input, user?.id || null);
    return result;
  } catch (err: any) {
    return { error: "SERVER_ERROR", message: err?.message || "Erro ao registrar solicitação." };
  }
}

/**
 * Server action para aprovação/rejeição de claim pelo Administrador
 */
export async function reviewAgencyClaimAction(input: {
  claimId: string;
  decision: "approved" | "rejected";
  adminNotes?: string;
  agencySlug?: string;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "Não autorizado." };
    }

    const result = await reviewAgencyClaim(input.claimId, input.decision, input.adminNotes);

    revalidatePath("/admin/claims");
    revalidatePath("/admin/agencias");
    if (input.agencySlug) {
      revalidatePath(`/imobiliaria/${input.agencySlug}`);
    }

    return result;
  } catch (err: any) {
    return { error: err?.message || "Erro ao revisar solicitação de claim." };
  }
}

