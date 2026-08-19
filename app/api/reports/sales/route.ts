import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import {
  getAuthenticatedUserWithStore,
  requireRole,
  MANAGERIAL_ROLES,
} from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/reports/sales?startDate=&endDate=&groupBy=day|month */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);

    const searchParams = request.nextUrl.searchParams;
    const groupBy = searchParams.get("groupBy") === "month" ? "month" : "day";

    const now = new Date();
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29); // 30 hari terakhir
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : now;

    const storeId = user.storeId;

    const rows = groupBy === "month"
      ? await prisma.$queryRaw<
        { period: Date; total_revenue: string; total_transactions: bigint }[]
      >`
          SELECT
            date_trunc('month', created_at) AS period,
            SUM(grand_total)::text AS total_revenue,
            COUNT(*)::bigint AS total_transactions
          FROM transactions
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
            AND status IN ('COMPLETED', 'PARTIALLY_REFUNDED')
            AND store_id = ${storeId}::uuid
          GROUP BY period
          ORDER BY period ASC
        `
      : await prisma.$queryRaw<
        { period: Date; total_revenue: string; total_transactions: bigint }[]
      >`
          SELECT
            date_trunc('day', created_at) AS period,
            SUM(grand_total)::text AS total_revenue,
            COUNT(*)::bigint AS total_transactions
          FROM transactions
          WHERE created_at BETWEEN ${startDate} AND ${endDate}
            AND status IN ('COMPLETED', 'PARTIALLY_REFUNDED')
            AND store_id = ${storeId}::uuid
          GROUP BY period
          ORDER BY period ASC
        `;

    const series = rows.map((r) => ({
      period: r.period,
      totalRevenue: Number(r.total_revenue ?? 0),
      totalTransactions: Number(r.total_transactions),
    }));

    return apiSuccess(series, "Data tren penjualan berhasil diambil.");
  });
}
