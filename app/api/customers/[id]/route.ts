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
import { updateCustomerSchema } from "@/lib/validations/customer.schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/customers/:id - customer details + transaction history */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            status: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      throw ApiError.notFound("Customer not found.");
    }
    requireSameStore(user.storeId, customer.storeId);

    return apiSuccess(customer, "Customer details successfully retrieved.");
  });
}

/** PATCH /api/customers/:id */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    const { id } = await params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw ApiError.notFound("Customer not found.");
    }
    requireSameStore(user.storeId, existing.storeId);

    const body = await request.json();
    const data = updateCustomerSchema.parse(body);

    const customer = await prisma.customer.update({ where: { id }, data });

    return apiSuccess(customer, "Customer data successfully updated.");
  });
}

/** DELETE /api/customers/:id - soft delete (OWNER/ADMIN only) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUserWithStore();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw ApiError.notFound("Customer not found.");
    }
    requireSameStore(user.storeId, existing.storeId);

    const customer = await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return apiSuccess(customer, "Customer successfully deleted (soft delete).");
  });
}
