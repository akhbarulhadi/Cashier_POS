import { NextRequest } from "next/server";
import { Prisma, StockMovementType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { createProductSchema, productQuerySchema } from "@/lib/validations/product.schema";

export const dynamic = "force-dynamic";

/** GET /api/products - list products with filter, search, & pagination */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    await getAuthenticatedUser();

    const query = productQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    let lowStockProductIds: string[] | undefined;
    if (query.lowStockOnly) {
      const rows = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM products WHERE stock <= min_stock AND deleted_at IS NULL
      `;
      lowStockProductIds = rows.map((r) => r.id);
    }

    const where: Prisma.ProductWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { sku: { contains: query.search, mode: "insensitive" } },
            { barcode: { contains: query.search, mode: "insensitive" } },
          ],
        }
        : {}),
      ...(lowStockProductIds ? { id: { in: lowStockProductIds } } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    return apiSuccess(products, "Product list successfully retrieved.", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  });
}

/** POST /api/products - create new product (OWNER/ADMIN only) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);

    const body = await request.json();
    const data = createProductSchema.parse(body);

    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category || category.deletedAt) {
      throw ApiError.badRequest("Selected category is invalid or has been deleted.");
    }

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({ data });

      // Record initial stock as INITIAL movement for ledger consistency
      if (created.stock > 0) {
        await tx.stockMovement.create({
          data: {
            productId: created.id,
            type: StockMovementType.INITIAL,
            quantity: created.stock,
            stockBefore: 0,
            stockAfter: created.stock,
            note: "Initial stock when product was created.",
            userId: user.id,
          },
        });
      }

      return created;
    });

    return apiSuccess(product, "Product successfully created.", 201);
  });
}
