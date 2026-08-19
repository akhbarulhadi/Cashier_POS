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
import { updateCategorySchema } from "@/lib/validations/category.schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/categories/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    const { id } = await params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    if (!category) throw ApiError.notFound("Category not found.");
    requireSameStore(user.storeId, category.storeId);

    return apiSuccess(category, "Category details successfully retrieved.");
  });
}

/** PATCH /api/categories/:id - update category (OWNER/ADMIN only) */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Category not found.");
    requireSameStore(user.storeId, existing.storeId);

    const body = await request.json();
    const data = updateCategorySchema.parse(body);

    const category = await prisma.category.update({ where: { id }, data });

    return apiSuccess(category, "Category successfully updated.");
  });
}

/** DELETE /api/categories/:id - soft delete (OWNER/ADMIN only) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Category not found.");
    requireSameStore(user.storeId, existing.storeId);
    if (existing.deletedAt) throw ApiError.conflict("Category has already been deleted.");

    const activeProductCount = await prisma.product.count({
      where: { categoryId: id, storeId: user.storeId, deletedAt: null },
    });
    if (activeProductCount > 0) {
      throw ApiError.conflict(
        `Category cannot be deleted because it still has ${activeProductCount} active products. Move or delete these products first.`
      );
    }

    const now = new Date();
    const category = await prisma.category.update({
      where: { id },
      data: {
        name: `deleted_${existing.name}_${now.getTime()}`,
        deletedAt: now,
      },
    });

    return apiSuccess(category, "Category successfully deleted (soft delete).");
  });
}
