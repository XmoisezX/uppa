"use server";

import { revalidatePath } from "next/cache";
import { updateCityPopulation } from "./services/ibge.service";
import { updateCityExpansionStatus } from "./services/city-expansion.service";
import { preRegisterDiscoveredAgency } from "./services/agency-discovery.service";
import { createOrAttachCrawlJob, updateCrawlJobStatus } from "./services/persistent-crawler.service";
import type { CityExpansionStatus, CityExpansionPriority, PreRegisterAgencyInput } from "./types";
import { getCurrentAdminUser } from "@/features/admin/services/auth";

/**
 * Ação administrativa para atualizar a população oficial via IBGE e recalcular score
 */
export async function updateCityPopulationAdminAction(cityId: string) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return { success: false as const, cityId, error: "Acesso negado: privilégios administrativos necessários." };
  }

  const res = await updateCityPopulation(cityId);
  if (res.success) {
    revalidatePath("/admin/expansao");
    revalidatePath(`/admin/expansao/${cityId}`);
  }
  return res;
}

/**
 * Ação administrativa para alterar o status e prioridade de expansão da cidade
 */
export async function updateCityStatusAdminAction(
  cityId: string,
  status: CityExpansionStatus,
  priority?: CityExpansionPriority
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const res = await updateCityExpansionStatus(cityId, status, priority);
  if (res.success) {
    revalidatePath("/admin/expansao");
    revalidatePath(`/admin/expansao/${cityId}`);
  }
  return res;
}

/**
 * Ação administrativa para pré-cadastrar uma imobiliária descoberta pela UPPA
 */
export async function preRegisterAgencyAdminAction(input: PreRegisterAgencyInput) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  try {
    const result = await preRegisterDiscoveredAgency(input);
    revalidatePath("/admin/expansao");
    if (input.cityId) {
      revalidatePath(`/admin/expansao/${input.cityId}`);
    }
    return { success: true, result };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Ação administrativa para iniciar ou anexar a um job de crawling persistente
 */
export async function startPersistentCrawlJobAction(params: {
  websiteSourceId: string;
  agencyId: string;
  cityId?: string | null;
  initialUrls?: string[];
}) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  try {
    const { job, isExisting } = await createOrAttachCrawlJob({
      websiteSourceId: params.websiteSourceId,
      agencyId: params.agencyId,
      cityId: params.cityId,
      trigger: "admin_expansion",
      initialUrls: params.initialUrls,
    });

    revalidatePath("/admin/expansao");
    if (params.cityId) {
      revalidatePath(`/admin/expansao/${params.cityId}`);
    }
    return { success: true, job, isExisting };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Ação administrativa para pausar ou cancelar um job persistente
 */
export async function updateCrawlJobStatusAction(
  jobId: string,
  newStatus: "paused" | "cancelled",
  cityId?: string | null
) {
  const admin = await getCurrentAdminUser();
  if (!admin) {
    return { success: false, error: "Acesso negado." };
  }

  const res = await updateCrawlJobStatus(jobId, newStatus);
  if (res.success) {
    revalidatePath("/admin/expansao");
    if (cityId) {
      revalidatePath(`/admin/expansao/${cityId}`);
    }
  }
  return res;
}
