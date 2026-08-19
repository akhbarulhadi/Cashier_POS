import { NextRequest } from "next/server";
import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import {
  getAuthenticatedUserWithStore,
  requireRole,
  MANAGERIAL_ROLES,
} from "@/lib/auth-helpers";
import { groq, GROQ_MODEL, isGroqConfigured } from "@/lib/groq";
import { chatRequestSchema } from "@/lib/validations/ai.schema";

export const dynamic = "force-dynamic";

interface TopProductAggregate {
  productName: string;
  _sum: { quantity: number | null };
}

async function getStoreContextSnapshot(storeId: string) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const validStatuses = [TransactionStatus.COMPLETED, TransactionStatus.PARTIALLY_REFUNDED];

  const [todayAgg, monthAgg, lowStockRows, bestSellerMonth, totalCustomers, totalActiveProducts] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: { storeId, createdAt: { gte: startOfToday }, status: { in: validStatuses } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { storeId, createdAt: { gte: startOfMonth }, status: { in: validStatuses } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM products
        WHERE stock <= min_stock AND deleted_at IS NULL AND is_active = true AND store_id = ${storeId}::uuid
      `,
      prisma.transactionItem.groupBy({
        by: ["productName"],
        where: {
          transaction: { storeId, createdAt: { gte: startOfMonth }, status: { in: validStatuses } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.customer.count({ where: { storeId, deletedAt: null } }),
      prisma.product.count({ where: { storeId, deletedAt: null, isActive: true } }),
    ]);

  return {
    todayRevenue: (todayAgg._sum.grandTotal ?? new Prisma.Decimal(0)).toString(),
    todayTransactions: todayAgg._count,
    monthRevenue: (monthAgg._sum.grandTotal ?? new Prisma.Decimal(0)).toString(),
    monthTransactions: monthAgg._count,
    lowStockCount: Number(lowStockRows[0]?.count ?? 0),
    topProductsThisMonth: bestSellerMonth.map((entry: TopProductAggregate) => ({
      name: entry.productName,
      quantitySold: entry._sum.quantity ?? 0,
    })),
    totalCustomers,
    totalActiveProducts,
  };
}

function buildSystemPrompt(context: Awaited<ReturnType<typeof getStoreContextSnapshot>>) {
  return (
    "Anda adalah AI Business Advisor untuk pemilik toko retail/UMKM di Indonesia yang menggunakan aplikasi cashier (POS) ini. " +
    "Berikan saran bisnis yang praktis, actionable, dan berbasis data. Jawab dalam Bahasa Indonesia yang jelas, ramah, dan tidak bertele-tele. " +
    "Gunakan format list/poin jika relevan. Jangan mengarang data - jika data yang dibutuhkan tidak ada dalam konteks, sampaikan asumsi Anda secara eksplisit.\n\n" +
    "=== KONTEKS DATA TOKO SAAT INI (REAL-TIME) ===\n" +
    `- Pendapatan hari ini: Rp ${context.todayRevenue} (${context.todayTransactions} transaksi)\n` +
    `- Pendapatan bulan ini: Rp ${context.monthRevenue} (${context.monthTransactions} transaksi)\n` +
    `- Jumlah product dengan stok menipis: ${context.lowStockCount}\n` +
    `- Jumlah product aktif: ${context.totalActiveProducts}\n` +
    `- Jumlah customer terdaftar: ${context.totalCustomers}\n` +
    `- Product terlaris bulan ini: ${context.topProductsThisMonth.length > 0
      ? context.topProductsThisMonth.map((p) => `${p.name} (${p.quantitySold} unit)`).join(", ")
      : "Belum ada data penjualan bulan ini."
    }\n` +
    "=== AKHIR KONTEKS ==="
  );
}

/** POST /api/ai/chat - Business Advisor Chatbot (khusus OWNER/ADMIN) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);

    const body = await request.json();
    const input = chatRequestSchema.parse(body);

    const lastUserMessage = input.messages[input.messages.length - 1];

    let sessionId = input.sessionId ?? null;
    if (!sessionId) {
      const titleCandidate = lastUserMessage?.content?.slice(0, 80) || "Sesi Baru";
      const session = await prisma.aiChatSession.create({
        data: {
          userId: user.id,
          storeId: user.storeId,
          title: titleCandidate,
        },
      });
      sessionId = session.id;
    } else {
      // Verifikasi kepemilikan session (harus milik user yang sama)
      const existingSession = await prisma.aiChatSession.findUnique({
        where: { id: sessionId },
      });
      if (!existingSession || existingSession.userId !== user.id) {
        const session = await prisma.aiChatSession.create({
          data: {
            userId: user.id,
            storeId: user.storeId,
            title: lastUserMessage?.content?.slice(0, 80) || "Sesi Baru",
          },
        });
        sessionId = session.id;
      }
    }

    if (lastUserMessage && lastUserMessage.role === "user") {
      await prisma.aiChatMessage.create({
        data: {
          sessionId,
          role: "user",
          content: lastUserMessage.content,
        },
      });
    }

    if (!isGroqConfigured()) {
      const fallbackReply =
        "Fitur AI Business Advisor belum aktif karena `GROQ_API_KEY` masih menggunakan nilai placeholder/dummy. " +
        "Silakan atur API key asli dari https://console.groq.com/keys pada file `.env` (variabel `GROQ_API_KEY`) untuk mengaktifkan asisten cerdas ini.";

      await prisma.aiChatMessage.create({
        data: { sessionId, role: "assistant", content: fallbackReply },
      });

      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      return apiSuccess(
        { reply: fallbackReply, aiGenerated: false, sessionId },
        "AI belum dikonfigurasi."
      );
    }

    try {
      const context = await getStoreContextSnapshot(user.storeId);
      const systemPrompt = buildSystemPrompt(context);

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          ...input.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });

      const reply =
        completion.choices[0]?.message?.content ||
        "Maaf, saya tidak dapat menghasilkan jawaban saat ini. Silakan coba lagi.";

      await prisma.aiChatMessage.create({
        data: { sessionId, role: "assistant", content: reply },
      });

      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      return apiSuccess({ reply, aiGenerated: true, context, sessionId }, "Balasan AI berhasil dibuat.");
    } catch (error) {
      console.error("[GROQ_CHAT_ERROR]", error);

      const errorReply =
        "Terjadi kendala saat menghubungi layanan AI (Groq). Periksa kembali validitas `GROQ_API_KEY` Anda, atau coba lagi dalam beberapa saat.";

      await prisma.aiChatMessage.create({
        data: { sessionId, role: "assistant", content: errorReply },
      });

      return apiSuccess(
        { reply: errorReply, aiGenerated: false, sessionId },
        "Failed menghubungi layanan AI."
      );
    }
  });
}
