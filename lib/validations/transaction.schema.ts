import { z } from "zod";
import { PaymentMethod } from "@prisma/client";

const uuid = z.string().uuid("Invalid ID format.");

/** Item sent from the shopping cart (Zustand cart) during checkout. */
export const checkoutItemSchema = z.object({
  productId: uuid,
  quantity: z.coerce
    .number()
    .int()
    .positive("Product quantity must be greater than 0."),
  discountAmount: z.coerce.number().nonnegative().default(0),
});

export const checkoutSchema = z
  .object({
    customerId: uuid.optional().nullable(),
    items: z
      .array(checkoutItemSchema)
      .min(1, "Cart cannot be empty. Add at least 1 product."),
    discountAmount: z.coerce.number().nonnegative().default(0), // global discount
    taxPercent: z.coerce.number().min(0).max(100).default(0),
    paymentMethod: z.nativeEnum(PaymentMethod, {
      required_error: "Payment method is required.",
    }),
    paidAmount: z.coerce
      .number({ required_error: "Paid amount is required." })
      .nonnegative("Paid amount cannot be negative."),
    notes: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => {
      const productIds = data.items.map((i) => i.productId);
      return new Set(productIds).size === productIds.length;
    },
    { message: "There are duplicate products in the cart.", path: ["items"] }
  );

export const transactionQuerySchema = z.object({
  search: z.string().trim().optional(), // search by invoice number
  status: z
    .enum(["PENDING", "COMPLETED", "REFUNDED", "PARTIALLY_REFUNDED", "CANCELLED"])
    .optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  cashierId: uuid.optional(),
  customerId: uuid.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/** Partial refund per-item; if `items` is not provided, it is considered a full refund. */
export const refundTransactionSchema = z.object({
  reason: z
    .string({ required_error: "Refund reason is required." })
    .trim()
    .min(5, "Refund reason must be at least 5 characters.")
    .max(500),
  items: z
    .array(
      z.object({
        transactionItemId: uuid,
        quantity: z.coerce.number().int().positive(),
      })
    )
    .optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type RefundTransactionInput = z.infer<typeof refundTransactionSchema>;
