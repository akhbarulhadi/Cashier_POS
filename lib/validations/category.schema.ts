import { z } from "zod";

export const createCategorySchema = z.object({
  name: z
    .string({ required_error: "Category name is required." })
    .trim()
    .min(2, "Category name must be at least 2 characters.")
    .max(100, "Category name must be at most 100 characters."),
  description: z.string().trim().max(500).optional().nullable(),
  imageUrl: z.string().trim().url("Invalid image URL.").or(z.literal("")).optional().nullable().transform(e => e === "" ? null : e),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
