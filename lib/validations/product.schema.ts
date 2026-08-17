import { z } from "zod";

const uuid = z.string().uuid("Invalid ID format.");

export const createProductSchema = z
  .object({
    sku: z
      .string({ required_error: "SKU is required." })
      .trim()
      .min(2, "SKU must be at least 2 characters.")
      .max(50, "SKU must be at most 50 characters."),
    barcode: z.string().trim().max(50).optional().nullable(),
    name: z
      .string({ required_error: "Product name is required." })
      .trim()
      .min(2, "Product name must be at least 2 characters.")
      .max(150, "Product name must be at most 150 characters."),
    categoryId: uuid,
    description: z.string().trim().max(1000).optional().nullable(),
    imageUrl: z.string().trim().url("Invalid image URL.").or(z.literal("")).optional().nullable().transform(e => e === "" ? null : e),
    costPrice: z.coerce
      .number({ required_error: "Cost price is required." })
      .nonnegative("Cost price cannot be negative."),
    sellPrice: z.coerce
      .number({ required_error: "Selling price is required." })
      .positive("Selling price must be greater than 0."),
    unit: z.string().trim().max(20).default("pcs"),
    stock: z.coerce.number().int().nonnegative().default(0),
    minStock: z.coerce.number().int().nonnegative().default(5),
    isActive: z.boolean().default(true),
  })
  .refine((data) => data.sellPrice >= data.costPrice, {
    message: "Selling price should not be lower than the cost price.",
    path: ["sellPrice"],
  });

export const updateProductSchema = z.object({
  sku: z.string().trim().min(2).max(50).optional(),
  barcode: z.string().trim().max(50).optional().nullable(),
  name: z.string().trim().min(2).max(150).optional(),
  categoryId: uuid.optional(),
  description: z.string().trim().max(1000).optional().nullable(),
  imageUrl: z.string().trim().url("Invalid image URL.").or(z.literal("")).optional().nullable().transform(e => e === "" ? null : e),
  costPrice: z.coerce.number().nonnegative().optional(),
  sellPrice: z.coerce.number().positive().optional(),
  unit: z.string().trim().max(20).optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

/** Special schema for manual stock adjustment (not via POS transaction). */
export const stockAdjustmentSchema = z.object({
  productId: uuid,
  type: z.enum(["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "PURCHASE_IN"], {
    required_error: "Mutation type is required.",
  }),
  quantity: z.coerce
    .number()
    .int()
    .positive("Quantity must be greater than 0."),
  note: z.string().trim().max(500).optional(),
});

export const productQuerySchema = z.object({
  search: z.string().trim().optional(),
  categoryId: uuid.optional(),
  lowStockOnly: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  includeDeleted: z.coerce.boolean().default(false),
  sortBy: z.enum(["name", "stock", "sellPrice", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
