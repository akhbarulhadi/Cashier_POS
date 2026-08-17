import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/** GET /api/products/low-stock */
export async function GET() {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM products
      WHERE stock <= min_stock AND deleted_at IS NULL AND is_active = true
    `;
    const ids = rows.map((r) => r.id);

    const products = await prisma.product.findMany({
      where: { id: { in: ids } },
      orderBy: { stock: "asc" },
      include: { category: { select: { id: true, name: true } } },
    });

    return apiSuccess(
      products,
      products.length > 0
        ? `Ditemukan ${products.length} product dengan stok menipis.`
        : "Semua product memiliki stok yang aman."
    );
  });
}
