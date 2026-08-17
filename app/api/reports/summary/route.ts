import { NextRequest } from "next/server";
import { Prisma, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/summary?startDate=&endDate=
 * Statistik utama untuk BI Dashboard: total pendapatan, jumlah transaksi,
 * rata-rata nilai transaksi, product terlaris, dan jumlah product stok menipis.
 */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const startDateParam = request.nextUrl.searchParams.get("startDate");
    const endDateParam = request.nextUrl.searchParams.get("endDate");

    const now = new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate()); // awal hari ini
    const endDate = endDateParam ? new Date(endDateParam) : now;

    const validStatuses: TransactionStatus[] = [
      TransactionStatus.COMPLETED,
      TransactionStatus.PARTIALLY_REFUNDED,
    ];

    const dateFilter: Prisma.TransactionWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      status: { in: validStatuses },
    };

    const [aggregate, transactionCount, refundAggregate, lowStockRows, bestSeller, totalCustomers] =
      await Promise.all([
        prisma.transaction.aggregate({
          where: dateFilter,
          _sum: { grandTotal: true },
        }),
        prisma.transaction.count({ where: dateFilter }),
        prisma.refundTransaction.aggregate({
          where: { createdAt: { gte: startDate, lte: endDate } },
          _sum: { totalAmount: true },
        }),
        prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint as count FROM products
          WHERE stock <= min_stock AND deleted_at IS NULL AND is_active = true
        `,
        prisma.transactionItem.groupBy({
          by: ["productId", "productName"],
          where: { transaction: dateFilter },
          _sum: { quantity: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 1,
        }),
        prisma.customer.count({ where: { deletedAt: null } }),
      ]);

    const grossRevenue = aggregate._sum.grandTotal ?? new Prisma.Decimal(0);
    const totalRefunds = refundAggregate._sum.totalAmount ?? new Prisma.Decimal(0);
    const netRevenue = grossRevenue.sub(totalRefunds);

    const averageTransactionValue =
      transactionCount > 0 ? netRevenue.div(transactionCount) : new Prisma.Decimal(0);

    return apiSuccess(
      {
        period: { startDate, endDate },
        grossRevenue,
        totalRefunds,
        netRevenue,
        totalTransactions: transactionCount,
        averageTransactionValue,
        lowStockCount: Number(lowStockRows[0]?.count ?? 0),
        totalCustomers,
        bestSellingProduct: bestSeller[0]
          ? {
              productId: bestSeller[0].productId,
              productName: bestSeller[0].productName,
              quantitySold: bestSeller[0]._sum.quantity ?? 0,
            }
          : null,
      },
      "Ringkasan statistik dashboard berhasil diambil."
    );
  });
}
