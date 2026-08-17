import { z } from "zod";

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().max(4000),
});

export const chatRequestSchema = z.object({
  sessionId: z.string().optional().nullable(),
  messages: z
    .array(chatMessageSchema)
    .min(1, "Percakapan tidak boleh kosong.")
    .max(30, "Riwayat percakapan terlalu panjang, mulai sesi baru."),
});

export const restockQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
