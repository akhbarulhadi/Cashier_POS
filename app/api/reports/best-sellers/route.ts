import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/best-sellers?startDate=&endDate=&limit=10
 * Daftar product terlaris berdasarkan kuantitas terjual dalam periode tertentu.
 * Juga dipakai sebagai input konteks untuk AI Restock Recommendation (TAHAP 3).
 */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get("limit") ?? 10), 50);

    const now = new Date();
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : now;

    const grouped = await prisma.transactionItem.groupBy({
      by: ["productId", "productName", "sku"],
      where: {
        transaction: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ["COMPLETED", "PARTIALLY_REFUNDED"] },
        },
      },
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: limit,
    });

    // Lampirkan info stok terkini agar tabel di UI bisa langsung menandai perlu restock atau tidak
    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, stock: true, minStock: true, imageUrl: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const bestSellers = grouped.map((g) => ({
      productId: g.productId,
      productName: g.productName,
      sku: g.sku,
      quantitySold: g._sum.quantity ?? 0,
      totalRevenue: g._sum.subtotal ?? 0,
      currentStock: productMap.get(g.productId)?.stock ?? null,
      minStock: productMap.get(g.productId)?.minStock ?? null,
      imageUrl: productMap.get(g.productId)?.imageUrl ?? null,
    }));

    return apiSuccess(bestSellers, "Daftar product terlaris berhasil diambil.");
  });
}
