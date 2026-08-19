import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import {
  getAuthenticatedUserWithStore,
  requireRole,
  requireSameStore,
  MANAGERIAL_ROLES,
} from "@/lib/auth-helpers";
import { updateProductSchema } from "@/lib/validations/product.schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/products/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        stockMovements: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: { user: { select: { id: true, fullName: true } } },
        },
      },
    });

    if (!product) throw ApiError.notFound("Product not found.");
    requireSameStore(user.storeId, product.storeId);

    return apiSuccess(product, "Product details successfully retrieved.");
  });
}

/** PATCH /api/products/:id - update master product data (OWNER/ADMIN only) */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Product not found.");
    requireSameStore(user.storeId, existing.storeId);

    const body = await request.json();
    const data = updateProductSchema.parse(body);

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category || category.deletedAt) {
        throw ApiError.badRequest("Selected category is invalid or has been deleted.");
      }
      if (category.storeId !== user.storeId) {
        throw ApiError.badRequest("Selected category does not belong to your store.");
      }
    }

    const product = await prisma.product.update({ where: { id }, data });

    return apiSuccess(product, "Product successfully updated.");
  });
}

/** DELETE /api/products/:id - soft delete (OWNER/ADMIN only) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Product not found.");
    requireSameStore(user.storeId, existing.storeId);
    if (existing.deletedAt) throw ApiError.conflict("Product has already been deleted.");

    const now = new Date();
    const dataToUpdate: Record<string, unknown> = {
      deletedAt: now,
      isActive: false,
      sku: `deleted_${existing.sku}_${now.getTime()}`,
    };
    if (existing.barcode) {
      dataToUpdate.barcode = `deleted_${existing.barcode}_${now.getTime()}`;
    }

    const product = await prisma.product.update({
      where: { id },
      data: dataToUpdate,
    });

    return apiSuccess(product, "Product successfully deleted (soft delete).");
  });
}
