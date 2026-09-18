"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserAgency } from "@/features/agencies/services";
import {
  getPropertyById,
  updateProperty,
  createDraftProperty,
  syncPropertyFeatures,
  addPropertyMedia,
  deletePropertyMedia,
  setCoverPropertyMedia,
  reorderPropertyMedia,
  publishProperty,
  savePropertyAsDraft,
  getCitiesByState,
} from "./services";
import type { CreatePropertyInput } from "@/lib/validations/property";
import type { MediaType } from "@/types/property";

/**
 * Validação de permissão: assegura que o usuário pertence à imobiliária dona do imóvel
 */
async function assertPropertyOwnership(propertyId: string) {
  const membership = await getCurrentUserAgency();
  if (!membership) {
    throw new Error("Você precisa estar vinculado a uma imobiliária ativa.");
  }

  const property = await getPropertyById(propertyId);
  if (!property) {
    throw new Error("Imóvel não encontrado.");
  }

  if (property.agencyId !== membership.agency.id) {
    throw new Error("Permissão negada: o imóvel pertence a outra imobiliária.");
  }

  return { membership, property };
}

/**
 * Criação inicial de rascunho de imóvel
 */
export async function createDraftPropertyAction() {
  try {
    const membership = await getCurrentUserAgency();
    if (!membership) {
      return {
        success: false,
        error: "Você precisa cadastrar ou vincular sua imobiliária antes de criar imóveis.",
      };
    }

    const draft = await createDraftProperty(membership.agency.id);
    revalidatePath("/painel/imoveis");

    return {
      success: true,
      propertyId: draft.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Falha ao inicializar rascunho de imóvel.",
    };
  }
}

/**
 * Autosave com atualização parcial de dados do imóvel
 */
export async function autosavePropertyAction(
  propertyId: string,
  input: Partial<CreatePropertyInput>
) {
  try {
    await assertPropertyOwnership(propertyId);
    const updated = await updateProperty(propertyId, input);

    return {
      success: true,
      updatedAt: updated.updatedAt,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro durante salvamento automático.",
    };
  }
}

/**
 * Sincronização atômica das características do imóvel
 */
export async function syncPropertyFeaturesAction(
  propertyId: string,
  featureIds: string[]
) {
  try {
    await assertPropertyOwnership(propertyId);
    await syncPropertyFeatures(propertyId, featureIds);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao atualizar características.",
    };
  }
}

/**
 * Adiciona mídia (foto/vídeo/planta) vinculada ao imóvel
 */
export async function addPropertyMediaAction(
  propertyId: string,
  data: { url: string; type?: MediaType; isCover?: boolean }
) {
  try {
    await assertPropertyOwnership(propertyId);
    const media = await addPropertyMedia(propertyId, data);

    return {
      success: true,
      media,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao adicionar mídia.",
    };
  }
}

/**
 * Remove mídia vinculada ao imóvel
 */
export async function deletePropertyMediaAction(
  propertyId: string,
  mediaId: string
) {
  try {
    await assertPropertyOwnership(propertyId);
    await deletePropertyMedia(propertyId, mediaId);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao remover mídia.",
    };
  }
}

/**
 * Define foto como capa principal do imóvel
 */
export async function setCoverMediaAction(
  propertyId: string,
  mediaId: string
) {
  try {
    await assertPropertyOwnership(propertyId);
    await setCoverPropertyMedia(propertyId, mediaId);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao definir capa.",
    };
  }
}

/**
 * Reordena fotos do imóvel
 */
export async function reorderMediaAction(
  propertyId: string,
  orderedIds: string[]
) {
  try {
    await assertPropertyOwnership(propertyId);
    await reorderPropertyMedia(propertyId, orderedIds);

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao reordenar fotos.",
    };
  }
}

/**
 * Publicação do imóvel (status = 'active')
 */
export async function publishPropertyAction(propertyId: string) {
  try {
    await assertPropertyOwnership(propertyId);
    const property = await publishProperty(propertyId);

    revalidatePath("/painel/imoveis");
    revalidatePath(`/imovel/${property.slug}`);

    return {
      success: true,
      property,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Falha ao publicar imóvel.",
    };
  }
}

/**
 * Confirmação de salvamento como Rascunho
 */
export async function saveDraftPropertyAction(propertyId: string) {
  try {
    await assertPropertyOwnership(propertyId);
    const property = await savePropertyAsDraft(propertyId);

    revalidatePath("/painel/imoveis");

    return {
      success: true,
      property,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Erro ao salvar rascunho.",
    };
  }
}

/**
 * Busca de municípios de um estado para o formulário
 */
export async function fetchCitiesByStateAction(stateId: string) {
  try {
    const cities = await getCitiesByState(stateId);
    return { success: true, cities };
  } catch (error: any) {
    return { success: false, cities: [], error: error?.message };
  }
}
