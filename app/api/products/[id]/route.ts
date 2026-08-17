import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { updateProductSchema } from "@/lib/validations/product.schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/products/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    await getAuthenticatedUser();
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

    return apiSuccess(product, "Product details successfully retrieved.");
  });
}

/** PATCH /api/products/:id - update master product data (OWNER/ADMIN only) */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Product not found.");

    const body = await request.json();
    const data = updateProductSchema.parse(body);

    if (data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: data.categoryId },
      });
      if (!category || category.deletedAt) {
        throw ApiError.badRequest("Selected category is invalid or has been deleted.");
      }
    }

    const product = await prisma.product.update({ where: { id }, data });

    return apiSuccess(product, "Product successfully updated.");
  });
}

/** DELETE /api/products/:id - soft delete (OWNER/ADMIN only) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("Product not found.");
    if (existing.deletedAt) throw ApiError.conflict("Product has already been deleted.");

    const now = new Date();
    const dataToUpdate: any = {
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
