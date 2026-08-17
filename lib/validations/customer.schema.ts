import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z
    .string({ required_error: "Customer name is required." })
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(150),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{6,20}$/, "Invalid phone number format.")
    .optional()
    .nullable(),
  email: z.string().trim().email("Invalid email format.").optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const customerQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
