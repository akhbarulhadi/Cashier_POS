import Groq from "groq-sdk";

/**
 * Groq AI Client
 * ============================================================================
 * Menggunakan Groq API (kompatibel format OpenAI Chat Completions) untuk:
 *   1. Rekomendasi restock berbasis data penjualan riil (lihat
 *      `app/api/ai/restock-recommendation/route.ts`).
 *   2. Business Advisor Chatbot untuk pemilik toko (lihat
 *      `app/api/ai/chat/route.ts`).
 *
 * `GROQ_API_KEY` di file `.env` diisi dengan DUMMY KEY sebagai placeholder
 * sesuai instruksi arsitektur. Ganti dengan API key asli dari
 * https://console.groq.com/keys untuk mengaktifkan fitur AI secara nyata.
 * Kedua route AI sudah dirancang untuk gagal secara graceful (fallback
 * rule-based / pesan informatif) apabila key belum valid.
 */
export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || "dummy_groq_api_key",
});

export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

/** Dipakai untuk mendeteksi apakah key yang dikonfigurasi masih placeholder/dummy. */
export function isGroqConfigured(): boolean {
  const key = process.env.GROQ_API_KEY;
  return Boolean(key && !key.toLowerCase().includes("dummy") && key.startsWith("gsk_"));
}
