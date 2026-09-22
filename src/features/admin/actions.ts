'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentAdminUser, checkPermission } from './services/auth';
import { logAdminAction } from './services/audit';
import { createBanner, updateBanner, deleteBanner } from './services/banners';
import { createArticle, updateArticle, deleteArticle } from './services/articles';
import { togglePropertyFeatured, updatePropertyStatus } from './services/properties';
import { updateUserRole, toggleUserStatus } from './services/users';
import { updateRolePermissions } from './services/roles';
import { toggleAgencyVerification, updateAgencyStatus } from './services/agencies';
import { toggleFeedStatus, triggerAdminFeedSync } from './services/feeds';
import { saveSiteSetting, createFAQ, updateFAQ, deleteFAQ } from './services/site';
import type { Banner } from '@/features/banners/types';
import type { ArticleCMS, SiteFAQ } from '@/types/admin';

// ==========================================
// BANNERS
// ==========================================
export async function saveBannerAction(data: Partial<Banner>) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'banners.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente (banners.manage).' };
  }

  try {
    if (data.id) {
      await updateBanner(data.id, data);
      await logAdminAction({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: 'UPDATE',
        module: 'banners',
        recordId: data.id,
        recordTitle: data.title,
        changes: data,
      });
    } else {
      const created = await createBanner(data);
      await logAdminAction({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: 'CREATE',
        module: 'banners',
        recordId: created?.id,
        recordTitle: created?.title,
        changes: data,
      });
    }

    revalidatePath('/admin/banners');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar banner.' };
  }
}

export async function deleteBannerAction(bannerId: string, title?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'banners.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    await deleteBanner(bannerId);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'DELETE',
      module: 'banners',
      recordId: bannerId,
      recordTitle: title || 'Banner',
    });

    revalidatePath('/admin/banners');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao remover banner.' };
  }
}

// ==========================================
// ARTIGOS / CMS
// ==========================================
export async function saveArticleAction(data: Partial<ArticleCMS>) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'articles.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente (articles.manage).' };
  }

  try {
    if (data.id && data.id.length > 30) {
      await updateArticle(data.id, data);
      await logAdminAction({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: 'UPDATE',
        module: 'articles',
        recordId: data.id,
        recordTitle: data.title,
        changes: data,
      });
    } else {
      const created = await createArticle(data);
      await logAdminAction({
        userId: admin.id,
        userEmail: admin.email,
        userName: admin.name,
        action: 'CREATE',
        module: 'articles',
        recordId: created.id,
        recordTitle: created.title,
        changes: data,
      });
    }

    revalidatePath('/admin/artigos');
    revalidatePath('/guias');
    if (data.slug) {
      revalidatePath(`/guias/${data.slug}`);
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar artigo.' };
  }
}

export async function deleteArticleAction(articleId: string, title?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'articles.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    await deleteArticle(articleId);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'DELETE',
      module: 'articles',
      recordId: articleId,
      recordTitle: title || 'Artigo',
    });

    revalidatePath('/admin/artigos');
    revalidatePath('/guias');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao remover artigo.' };
  }
}

// ==========================================
// IMÓVEIS
// ==========================================
export async function togglePropertyFeaturedAction(propertyId: string, currentFeatured: boolean, title?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'properties.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente.' };
  }

  try {
    await togglePropertyFeatured(propertyId, currentFeatured);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: currentFeatured ? 'UNFEATURE' : 'FEATURE',
      module: 'properties',
      recordId: propertyId,
      recordTitle: title || 'Imóvel',
      changes: { featured: !currentFeatured },
    });

    revalidatePath('/admin/imoveis');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar destaque.' };
  }
}

export async function updatePropertyStatusAction(propertyId: string, newStatus: string, title?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'properties.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente.' };
  }

  try {
    await updatePropertyStatus(propertyId, newStatus);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'UPDATE_STATUS',
      module: 'properties',
      recordId: propertyId,
      recordTitle: title || 'Imóvel',
      changes: { status: newStatus },
    });

    revalidatePath('/admin/imoveis');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar status.' };
  }
}

// ==========================================
// USUÁRIOS & CARGOS
// ==========================================
export async function updateUserRoleAction(userId: string, newRoleId: string, userEmail?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'users.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente (users.manage).' };
  }

  try {
    await updateUserRole(userId, newRoleId);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'CHANGE_ROLE',
      module: 'users',
      recordId: userId,
      recordTitle: userEmail || 'Usuário',
      changes: { newRoleId },
    });

    revalidatePath('/admin/usuarios');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar cargo.' };
  }
}

export async function toggleUserStatusAction(userId: string, currentStatus: string, userEmail?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'users.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente.' };
  }

  try {
    await toggleUserStatus(userId, currentStatus);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: currentStatus === 'active' ? 'SUSPEND' : 'ACTIVATE',
      module: 'users',
      recordId: userId,
      recordTitle: userEmail || 'Usuário',
    });

    revalidatePath('/admin/usuarios');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar status do usuário.' };
  }
}

export async function updateRolePermissionsAction(roleId: string, permissionCodes: string[], roleName?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'roles.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente (roles.manage).' };
  }

  try {
    await updateRolePermissions(roleId, permissionCodes);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'UPDATE_PERMISSIONS',
      module: 'roles',
      recordId: roleId,
      recordTitle: roleName || 'Cargo',
      changes: { permissions: permissionCodes },
    });

    revalidatePath('/admin/cargos');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar permissões do cargo.' };
  }
}

// ==========================================
// AGÊNCIAS
// ==========================================
export async function toggleAgencyVerificationAction(agencyId: string, currentVerified: boolean, agencyName?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'agencies.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    await toggleAgencyVerification(agencyId, currentVerified);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: currentVerified ? 'UNVERIFY_AGENCY' : 'VERIFY_AGENCY',
      module: 'agencies',
      recordId: agencyId,
      recordTitle: agencyName || 'Agência',
    });

    revalidatePath('/admin/agencias');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar verificação.' };
  }
}

export async function updateAgencyStatusAction(agencyId: string, newStatus: string, agencyName?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'agencies.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    await updateAgencyStatus(agencyId, newStatus);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'UPDATE_AGENCY_STATUS',
      module: 'agencies',
      recordId: agencyId,
      recordTitle: agencyName || 'Agência',
      changes: { status: newStatus },
    });

    revalidatePath('/admin/agencias');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar status da agência.' };
  }
}

// ==========================================
// FEEDS
// ==========================================
export async function toggleFeedStatusAction(feedId: string, currentStatus: string, agencyName?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'feeds.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    await toggleFeedStatus(feedId, currentStatus);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: currentStatus === 'active' ? 'PAUSE_FEED' : 'ACTIVATE_FEED',
      module: 'feeds',
      recordId: feedId,
      recordTitle: `Feed ${agencyName || ''}`,
    });

    revalidatePath('/admin/feeds');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao alterar status do feed.' };
  }
}

export async function triggerFeedSyncAction(feedId: string, agencyName?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'feeds.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    const report = await triggerAdminFeedSync(feedId);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'MANUAL_SYNC_FEED',
      module: 'feeds',
      recordId: feedId,
      recordTitle: `Feed ${agencyName || ''}`,
      changes: { itemsFound: report.itemsFound, itemsCreated: report.itemsCreated, itemsUpdated: report.itemsUpdated },
    });

    revalidatePath('/admin/feeds');
    revalidatePath('/admin/imoveis');
    return { success: true, report };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao disparar sincronização.' };
  }
}

// ==========================================
// SITE & FAQS & SETTINGS
// ==========================================
export async function saveSiteSettingAction(key: string, value: any, description?: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'site.manage')) {
    return { success: false, error: 'Acesso negado: permissão insuficiente (site.manage).' };
  }

  try {
    await saveSiteSetting(key, value, description);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'UPDATE_SETTING',
      module: 'site',
      recordId: key,
      recordTitle: `Configuração: ${key}`,
      changes: value,
    });

    revalidatePath('/admin/site');
    revalidatePath('/admin/configuracoes');
    revalidatePath('/admin/seo');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar configuração.' };
  }
}

export async function saveFAQAction(data: Partial<SiteFAQ>) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'site.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    if (data.id && data.id.length > 30) {
      await updateFAQ(data.id, data);
    } else {
      await createFAQ(data);
    }

    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'SAVE_FAQ',
      module: 'site',
      recordId: data.id || null,
      recordTitle: data.question || 'FAQ',
    });

    revalidatePath('/admin/site');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar FAQ.' };
  }
}

export async function deleteFAQAction(faqId: string) {
  const admin = await getCurrentAdminUser();
  if (!admin || !checkPermission(admin, 'site.manage')) {
    return { success: false, error: 'Acesso negado.' };
  }

  try {
    await deleteFAQ(faqId);
    await logAdminAction({
      userId: admin.id,
      userEmail: admin.email,
      userName: admin.name,
      action: 'DELETE_FAQ',
      module: 'site',
      recordId: faqId,
      recordTitle: 'FAQ Removido',
    });

    revalidatePath('/admin/site');
    revalidatePath('/(public)', 'layout');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir FAQ.' };
  }
}
