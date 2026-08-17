import { NextRequest } from "next/server";
import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { groq, GROQ_MODEL, isGroqConfigured } from "@/lib/groq";
import { chatRequestSchema } from "@/lib/validations/ai.schema";

export const dynamic = "force-dynamic";

interface TopProductAggregate {
  productName: string;
  _sum: { quantity: number | null };
}

/** Mengambil ringkasan kondisi toko secara real-time untuk "menjangkarkan" jawaban AI pada data nyata. */
async function getStoreContextSnapshot() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const validStatuses = [TransactionStatus.COMPLETED, TransactionStatus.PARTIALLY_REFUNDED];

  const [todayAgg, monthAgg, lowStockRows, bestSellerMonth, totalCustomers, totalActiveProducts] =
    await Promise.all([
      prisma.transaction.aggregate({
        where: { createdAt: { gte: startOfToday }, status: { in: validStatuses } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: { in: validStatuses } },
        _sum: { grandTotal: true },
        _count: true,
      }),
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM products
        WHERE stock <= min_stock AND deleted_at IS NULL AND is_active = true
      `,
      prisma.transactionItem.groupBy({
        by: ["productName"],
        where: {
          transaction: { createdAt: { gte: startOfMonth }, status: { in: validStatuses } },
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.customer.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { deletedAt: null, isActive: true } }),
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
    `- Product terlaris bulan ini: ${
      context.topProductsThisMonth.length > 0
        ? context.topProductsThisMonth.map((p) => `${p.name} (${p.quantitySold} unit)`).join(", ")
        : "Belum ada data penjualan bulan ini."
    }\n` +
    "=== AKHIR KONTEKS ==="
  );
}

/** POST /api/ai/chat - Business Advisor Chatbot (khusus OWNER/ADMIN) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const body = await request.json();
    const input = chatRequestSchema.parse(body);

    // Ambil pesan terakhir dari user (yang baru dikirim)
    const lastUserMessage = input.messages[input.messages.length - 1];

    // Tentukan atau buat session
    let sessionId = input.sessionId ?? null;
    if (!sessionId) {
      // Buat session baru, judul diambil dari pesan pertama user (max 80 chars)
      const titleCandidate = lastUserMessage?.content?.slice(0, 80) || "Sesi Baru";
      const session = await prisma.aiChatSession.create({
        data: {
          userId: user.id,
          title: titleCandidate,
        },
      });
      sessionId = session.id;
    } else {
      // Verifikasi kepemilikan session
      const existingSession = await prisma.aiChatSession.findUnique({
        where: { id: sessionId },
      });
      if (!existingSession || existingSession.userId !== user.id) {
        // Session tidak valid, buat baru
        const session = await prisma.aiChatSession.create({
          data: {
            userId: user.id,
            title: lastUserMessage?.content?.slice(0, 80) || "Sesi Baru",
          },
        });
        sessionId = session.id;
      }
    }

    // Simpan pesan user ke database
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

      // Simpan response fallback ke database
      await prisma.aiChatMessage.create({
        data: { sessionId, role: "assistant", content: fallbackReply },
      });

      // Update session timestamp
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
      const context = await getStoreContextSnapshot();
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

      // Simpan reply AI ke database
      await prisma.aiChatMessage.create({
        data: { sessionId, role: "assistant", content: reply },
      });

      // Update session timestamp
      await prisma.aiChatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      });

      return apiSuccess({ reply, aiGenerated: true, context, sessionId }, "Balasan AI berhasil dibuat.");
    } catch (error) {
      console.error("[GROQ_CHAT_ERROR]", error);

      const errorReply =
        "Terjadi kendala saat menghubungi layanan AI (Groq). Periksa kembali validitas `GROQ_API_KEY` Anda, atau coba lagi dalam beberapa saat.";

      // Simpan error reply ke database juga agar konteks percakapan tetap lengkap
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

