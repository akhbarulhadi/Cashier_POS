import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { groq, GROQ_MODEL, isGroqConfigured } from "@/lib/groq";
import { restockQuerySchema } from "@/lib/validations/ai.schema";

export const dynamic = "force-dynamic";

type ProductInsight = {
  productId: string;
  productName: string;
  sku: string;
  currentStock: number;
  minStock: number;
  quantitySoldInPeriod: number;
  avgDailySales: number;
  estimatedDaysUntilStockout: number | null;
};

type Urgency = "HIGH" | "MEDIUM" | "LOW";

interface Recommendation {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedRestockQty: number;
  urgency: Urgency;
  reasoning: string;
}

/** Menyusun rekomendasi restock rule-based (fallback jika Groq API tidak tersedia/gagal). */
function buildRuleBasedRecommendations(insights: ProductInsight[]): {
  recommendations: Recommendation[];
  summary: string;
} {
  const recommendations: Recommendation[] = insights
    .filter((p) => p.currentStock <= p.minStock || (p.estimatedDaysUntilStockout ?? 999) <= 14)
    .map((p) => {
      let urgency: Urgency = "LOW";
      if (p.currentStock <= p.minStock * 0.5 || (p.estimatedDaysUntilStockout ?? 999) <= 3) {
        urgency = "HIGH";
      } else if (p.currentStock <= p.minStock || (p.estimatedDaysUntilStockout ?? 999) <= 7) {
        urgency = "MEDIUM";
      }

      const targetDays = 14;
      const projectedNeed = Math.ceil(p.avgDailySales * targetDays);
      const suggestedRestockQty = Math.max(
        p.minStock * 2 - p.currentStock,
        projectedNeed - p.currentStock,
        p.minStock
      );

      return {
        productId: p.productId,
        productName: p.productName,
        currentStock: p.currentStock,
        minStock: p.minStock,
        suggestedRestockQty: Math.max(1, suggestedRestockQty),
        urgency,
        reasoning:
          p.estimatedDaysUntilStockout !== null
            ? `Stok diperkirakan habis dalam ~${p.estimatedDaysUntilStockout.toFixed(
                1
              )} hari berdasarkan rata-rata penjualan ${p.avgDailySales.toFixed(
                1
              )} unit/hari. Stok saat ini (${p.currentStock}) berada di bawah atau mendekati batas minimum (${p.minStock}).`
            : `Stok saat ini (${p.currentStock}) sudah berada di bawah atau sama dengan batas minimum (${p.minStock}), meskipun belum ada penjualan tercatat pada periode ini.`,
      };
    })
    .sort((a, b) => {
      const order: Record<Urgency, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return order[a.urgency] - order[b.urgency];
    });

  const summary =
    recommendations.length > 0
      ? `Ditemukan ${recommendations.length} product yang memerlukan perhatian restock, ${
          recommendations.filter((r) => r.urgency === "HIGH").length
        } di antaranya berprioritas TINGGI.`
      : "Seluruh stok product saat ini dalam kondisi aman berdasarkan tren penjualan terakhir.";

  return { recommendations, summary };
}

/** GET /api/ai/restock-recommendation?days=30 - rekomendasi restock cerdas (khusus OWNER/ADMIN) */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const { days } = restockQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [products, salesGrouped] = await Promise.all([
      prisma.product.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, sku: true, stock: true, minStock: true },
      }),
      prisma.transactionItem.groupBy({
        by: ["productId"],
        where: {
          transaction: {
            createdAt: { gte: startDate },
            status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
          },
        },
        _sum: { quantity: true },
      }),
    ]);

    const salesMap = new Map(
      salesGrouped.map((s) => [s.productId, s._sum.quantity ?? 0])
    );

    const insights: ProductInsight[] = products.map((p) => {
      const quantitySoldInPeriod = salesMap.get(p.id) ?? 0;
      const avgDailySales = quantitySoldInPeriod / days;
      const estimatedDaysUntilStockout =
        avgDailySales > 0 ? p.stock / avgDailySales : null;

      return {
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        currentStock: p.stock,
        minStock: p.minStock,
        quantitySoldInPeriod,
        avgDailySales,
        estimatedDaysUntilStockout,
      };
    });

    const relevantInsights = insights
      .filter((p) => p.currentStock <= p.minStock * 2 || p.quantitySoldInPeriod > 0)
      .sort((a, b) => (a.estimatedDaysUntilStockout ?? 999) - (b.estimatedDaysUntilStockout ?? 999))
      .slice(0, 40);

    if (!isGroqConfigured()) {
      const { recommendations, summary } = buildRuleBasedRecommendations(relevantInsights);
      return apiSuccess(
        { recommendations, summary, aiGenerated: false },
        "Rekomendasi restock berhasil dibuat (mode rule-based - GROQ_API_KEY belum dikonfigurasi)."
      );
    }

    try {
      const dataTable = relevantInsights
        .map(
          (p) =>
            `- [ID: ${p.productId}] ${p.productName} (SKU: ${p.sku}) | Stok saat ini: ${p.currentStock} | Stok minimum: ${p.minStock} | Terjual ${days} hari terakhir: ${p.quantitySoldInPeriod} unit | Rata-rata/hari: ${p.avgDailySales.toFixed(
              2
            )} | Estimasi habis dalam: ${
              p.estimatedDaysUntilStockout !== null
                ? `${p.estimatedDaysUntilStockout.toFixed(1)} hari`
                : "tidak dapat diprediksi (belum ada penjualan)"
            }`
        )
        .join("\n");

      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Anda adalah AI Analis Inventaris untuk aplikasi cashier (POS) toko retail di Indonesia. " +
              "Tugas Anda menganalisis data stok & penjualan riil, lalu memberi rekomendasi restock yang actionable. " +
              'Balas HANYA dalam format JSON valid dengan struktur: {"summary": string, "recommendations": [{"productId": string, "productName": string, "currentStock": number, "minStock": number, "suggestedRestockQty": number, "urgency": "HIGH"|"MEDIUM"|"LOW", "reasoning": string}]}. ' +
              "Gunakan Bahasa Indonesia yang ringkas dan profesional pada field summary & reasoning.",
          },
          {
            role: "user",
            content: `Berikut data stok & penjualan ${days} hari terakhir:\n\n${dataTable}\n\nBerikan rekomendasi restock untuk product yang perlu diperhatikan.`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(raw) as {
        summary?: string;
        recommendations?: Recommendation[];
      };

      return apiSuccess(
        {
          recommendations: parsed.recommendations ?? [],
          summary: parsed.summary ?? "Analisis AI selesai.",
          aiGenerated: true,
        },
        "Rekomendasi restock berbasis AI berhasil dibuat."
      );
    } catch (error) {
      console.error("[GROQ_RESTOCK_ERROR]", error);
      const { recommendations, summary } = buildRuleBasedRecommendations(relevantInsights);
      return apiSuccess(
        {
          recommendations,
          summary,
          aiGenerated: false,
          warning: "Panggilan ke Groq AI gagal, menampilkan rekomendasi berbasis aturan sebagai fallback.",
        },
        "Rekomendasi restock berhasil dibuat (fallback)."
      );
    }
  });
}
