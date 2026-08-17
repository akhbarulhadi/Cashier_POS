import { NextRequest } from "next/server";
import { StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { stockAdjustmentSchema } from "@/lib/validations/product.schema";

export const dynamic = "force-dynamic";

/** GET /api/stock-movements - riwayat mutasi stok (filter by productId opsional) */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    const productId = request.nextUrl.searchParams.get("productId") ?? undefined;
    const page = Number(request.nextUrl.searchParams.get("page") ?? 1);
    const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 20), 100);

    const where = productId ? { productId } : {};

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          product: { select: { id: true, name: true, sku: true, unit: true } },
          user: { select: { id: true, fullName: true } },
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return apiSuccess(movements, "Riwayat mutasi stok berhasil diambil.", 200, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  });
}

/**
 * POST /api/stock-movements - penyesuaian stok manual (khusus OWNER/ADMIN)
 * Dipakai untuk kasus: barang masuk dari supplier, stok opname, koreksi kesalahan input.
 * WAJIB memakai Prisma Transaction agar `Product.stock` dan `StockMovement` konsisten.
 */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const body = await request.json();
    const data = stockAdjustmentSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product || product.deletedAt) {
        throw ApiError.notFound("Product tidak ditemukan atau sudah dihapus.");
      }

      const isDeduction = data.type === "ADJUSTMENT_OUT";
      const stockBefore = product.stock;
      const stockAfter = isDeduction
        ? stockBefore - data.quantity
        : stockBefore + data.quantity;

      if (stockAfter < 0) {
        throw ApiError.unprocessable(
          `Stok tidak mencukupi. Stok saat ini: ${stockBefore}, pengurangan diminta: ${data.quantity}.`
        );
      }

      const updatedProduct = await tx.product.update({
        where: { id: data.productId },
        data: { stock: stockAfter },
      });

      const movement = await tx.stockMovement.create({
        data: {
          productId: data.productId,
          type: data.type as StockMovementType,
          quantity: data.quantity,
          stockBefore,
          stockAfter,
          note: data.note,
          userId: user.id,
        },
      });

      return { product: updatedProduct, movement };
    });

    return apiSuccess(result, "Penyesuaian stok berhasil dicatat.", 201);
  });
}
