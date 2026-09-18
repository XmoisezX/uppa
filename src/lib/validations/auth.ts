import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z
    .string()
    .min(6, "A senha deve conter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  fullName: z
    .string()
    .min(2, "Nome ou razão social deve ter no mínimo 2 caracteres"),
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("Informe um e-mail válido"),
  password: z
    .string()
    .min(6, "A senha deve conter no mínimo 6 caracteres"),
  role: z.enum([
    "consumer",
    "broker",
    "agency_admin",
  ]),
});

export const recoverPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .email("Informe um e-mail válido"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;
