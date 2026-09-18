"use server";

import { revalidatePath } from "next/cache";
import { createAgency, updateAgency } from "./services";
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
