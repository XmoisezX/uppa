/**
 * Tipos de Usuário e Autenticação definidos no MASTER_PLAN.md (Seção 6 e 18)
 */

export type UserRole =
  | "consumer"        // Comprador / Locatário
  | "broker"          // Corretor autônomo ou vinculado
  | "agency_member"   // Membro de equipe de imobiliária
  | "agency_admin"    // Administrador de imobiliária
  | "platform_admin"; // Administrador da plataforma (RBAC)

export type { AgencyMemberRole } from "./agency";


export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: {
    id: string;
    email?: string;
  } | null;
  profile: Profile | null;
  isLoading: boolean;
}
