import { z } from "zod";

export const transactionTypeEnum = z.enum(["sale", "rent", "sale_or_rent"]);

export const propertyStatusEnum = z.enum([
  "draft",
  "pending",
  "active",
  "inactive",
  "sold",
  "rented",
  "blocked",
  "archived",
]);

export const propertyTypeEnum = z.enum([
  "apartment",
  "house",
  "townhouse",
  "land",
  "farm",
  "commercial",
  "office",
  "warehouse",
  "studio",
  "loft",
  "kitnet",
  "penthouse",
  "condo_house",
  "rural",
  "other",
]);

export const listingSourceEnum = z.enum([
  "manual",
  "vrsync",
  "api",
  "csv",
  "partner",
]);

export const mediaTypeEnum = z.enum([
  "image",
  "video",
  "virtual_tour",
  "floor_plan",
]);

/**
 * Validação de dados cadastrais de imóveis conforme Seções 10, 11 e 83 do MASTER_PLAN
 */
export const createPropertySchema = z.object({
  agencyId: z.string().uuid("ID de imobiliária inválido"),
  brokerId: z.string().uuid("ID de corretor inválido").optional().nullable(),
  externalId: z.string().min(1, "Código identificador do anúncio é obrigatório"),
  source: listingSourceEnum.default("manual"),
  slug: z
    .string()
    .min(3, "Slug deve conter no mínimo 3 caracteres")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug deve estar em formato kebab-case"),
  title: z
    .string()
    .min(5, "Título do anúncio deve conter no mínimo 5 caracteres")
    .max(150, "Título não pode ultrapassar 150 caracteres"),
  description: z.string().optional().nullable(),
  transactionType: transactionTypeEnum,
  propertyType: propertyTypeEnum,
  status: propertyStatusEnum.default("draft"),
  price: z.number().positive("Preço de venda deve ser maior que zero").optional().nullable(),
  rentPrice: z.number().positive("Valor de locação deve ser maior que zero").optional().nullable(),
  condominiumFee: z.number().nonnegative().optional().nullable(),
  iptu: z.number().nonnegative().optional().nullable(),
  bedrooms: z.number().int().nonnegative().default(0),
  suites: z.number().int().nonnegative().default(0),
  bathrooms: z.number().int().nonnegative().default(0),
  parkingSpaces: z.number().int().nonnegative().default(0),
  usableArea: z.number().positive().optional().nullable(),
  totalArea: z.number().positive().optional().nullable(),
  lotArea: z.number().positive().optional().nullable(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear() + 1).optional().nullable(),
  financiable: z.boolean().default(false),
  acceptsExchange: z.boolean().default(false),
  acceptsVehicle: z.boolean().default(false),
  furnished: z.boolean().default(false),
  petFriendly: z.boolean().default(false),
  addressVisible: z.boolean().default(false),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  zipcode: z.string().optional().nullable(),
  stateId: z.string().uuid().optional().nullable(),
  cityId: z.string().uuid().optional().nullable(),
  neighborhoodId: z.string().uuid().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  featureIds: z.array(z.string().uuid()).optional(),
});

export const updatePropertySchema = createPropertySchema.partial().extend({
  id: z.string().uuid("ID do imóvel é obrigatório"),
});

export const createMediaSchema = z.object({
  propertyId: z.string().uuid("ID de imóvel inválido"),
  type: mediaTypeEnum.default("image"),
  url: z.string().url("URL de mídia inválida"),
  thumbnailUrl: z.string().url().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  position: z.number().int().nonnegative().default(0),
  isCover: z.boolean().default(false),
});

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
export type CreateMediaInput = z.infer<typeof createMediaSchema>;
