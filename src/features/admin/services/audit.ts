import { createAdminClient } from '@/lib/supabase/admin';
import type { AdminAuditLog } from '@/types/admin';

export interface CreateAuditLogParams {
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  action: string;
  module: string;
  recordId?: string | null;
  recordTitle?: string | null;
  changes?: Record<string, any> | null;
  ipAddress?: string | null;
}

/**
 * Registra um evento de auditoria administrativa de forma resiliente.
 */
export async function logAdminAction(params: CreateAuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('admin_audit_logs').insert({
      user_id: params.userId || null,
      user_email: params.userEmail || null,
      user_name: params.userName || null,
      action: params.action,
      module: params.module,
      record_id: params.recordId || null,
      record_title: params.recordTitle || null,
      changes: params.changes || null,
      ip_address: params.ipAddress || null,
    });
  } catch (error) {
    // Se a tabela ainda não existir ou falhar, apenas registra no console sem travar a operação principal
    console.warn('[Audit Log Error]', error);
  }
}

/**
 * Retorna os logs de auditoria mais recentes.
 */
export async function getRecentAuditLogs(limit: number = 20): Promise<AdminAuditLog[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    return data as AdminAuditLog[];
  } catch {
    return [];
  }
}
