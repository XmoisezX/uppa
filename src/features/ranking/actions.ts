"use server";

import { revalidatePath } from "next/cache";
import { getCurrentAdminUser, checkPermission } from "@/features/admin/services/auth";
import { updateRankingConfig, getPropertyRankingBreakdown } from "./services";
import type { RankingWeights } from "./types";
import { validateRankingWeights } from "./config";

/**
 * Atualiza os pesos e configurações do sistema de ranking pelo Super Administrador.
 */
export async function updateRankingConfigAction(weights: RankingWeights) {
  try {
    const admin = await getCurrentAdminUser();
    if (!admin) {
      return { success: false, error: "Acesso não autorizado. Faça login novamente." };
    }

    const isSuper =
      admin.email?.toLowerCase() === "moiseztorres100@gmail.com" ||
      admin.role?.slug === "super_admin";

    if (!isSuper && !checkPermission(admin, "settings.manage")) {
      return {
        success: false,
        error: "Apenas o Super Administrador pode alterar os pesos de ranking da plataforma.",
      };
    }

    const validation = validateRankingWeights(weights);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const result = await updateRankingConfig(weights, admin.email || "moiseztorres100@gmail.com");
    if (!result.success) {
      return { success: false, error: result.error || "Falha ao salvar pesos do ranking." };
    }

    revalidatePath("/admin/ranking");
    revalidatePath("/admin/imoveis");
    revalidatePath("/comprar");
    revalidatePath("/alugar");
    revalidatePath("/");

    return {
      success: true,
      message: "Pesos do ranking de imóveis atualizados com sucesso (Soma = 100 pontos).",
      config: result.config,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro inesperado ao atualizar configuração do ranking.",
    };
  }
}

/**
 * Consulta a discriminação completa do score (diagnóstico) de um imóvel.
 */
export async function getPropertyRankingDetailsAction(propertyId: string) {
  try {
    const admin = await getCurrentAdminUser();
    if (!admin) {
      return { success: false, error: "Usuário não autenticado." };
    }

    const ranking = await getPropertyRankingBreakdown(propertyId);
    if (!ranking) {
      return { success: false, error: "Imóvel não encontrado ou sem dados para cálculo." };
    }

    return {
      success: true,
      ranking,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Erro ao consultar score do imóvel.",
    };
  }
}
