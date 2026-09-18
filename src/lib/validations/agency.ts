import { z } from "zod";

/**
 * Validação de dados cadastrais da imobiliária conforme Seção 17 do MASTER_PLAN
 */
export const createAgencySchema = z.object({
  name: z
    .string()
    .min(2, "Nome da imobiliária deve ter no mínimo 2 caracteres")
    .max(100, "Nome não pode exceder 100 caracteres"),
  slug: z
    .string()
    .min(2, "Slug deve ter no mínimo 2 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve conter apenas letras minúsculas, números e traços"),
  creci: z
    .string()
    .min(3, "Número do CRECI é obrigatório (ex: 12345-J)"),
  whatsapp: z
    .string()
    .min(10, "Número de WhatsApp com DDD é obrigatório"),
  email: z
    .string()
    .email("Informe um e-mail de contato válido"),
  legalName: z.string().optional().nullable(),
  document: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  website: z.string().url("URL de website inválida").optional().or(z.literal("")).nullable(),
  description: z.string().max(1000, "Descrição não pode ultrapassar 1000 caracteres").optional().nullable(),
  cityId: z.string().uuid("ID de cidade inválido").optional().nullable(),
});

export const updateAgencySchema = createAgencySchema.partial().extend({
  id: z.string().uuid("ID da imobiliária é obrigatório"),
});

export type CreateAgencyInput = z.infer<typeof createAgencySchema>;
export type UpdateAgencyInput = z.infer<typeof updateAgencySchema>;
