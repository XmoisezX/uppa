import type { UserRole, AgencyMemberRole } from "@/types/auth";

/**
 * Funções de verificação de permissões RBAC definidas no MASTER_PLAN.md (Seção 6 e 32)
 */

export function canManageAgency(role?: UserRole | null): boolean {
  return role === "agency_admin" || role === "platform_admin";
}

export function canEditProperties(
  userRole?: UserRole | null,
  memberRole?: AgencyMemberRole | null
): boolean {
  if (userRole === "platform_admin") return true;
  if (userRole === "agency_admin") return true;
  if (userRole === "agency_member") {
    return memberRole === "owner" || memberRole === "admin" || memberRole === "broker";
  }
  return false;
}

export function isPlatformAdmin(role?: UserRole | null): boolean {
  return role === "platform_admin";
}
