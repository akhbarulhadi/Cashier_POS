import { NextRequest } from "next/server";
import { TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/transactions/:id - detail lengkap transaksi (untuk struk/cetak & detail page) */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { id: true, name: true, unit: true } } } },
        cashier: { select: { id: true, fullName: true } },
        customer: true,
        refunds: { include: { items: true, handledBy: { select: { fullName: true } } } },
      },
    });

    if (!transaction) throw ApiError.notFound("Transaction not found.");

    const isManagerial = currentUser.role === "OWNER" || currentUser.role === "ADMIN";
    if (!isManagerial && transaction.cashierId !== currentUser.id) {
      throw ApiError.forbidden("Anda tidak memiliki akses untuk melihat transaksi ini.");
    }

    return apiSuccess(transaction, "Transaction details successfully retrieved.");
  });
}

/** DELETE /api/transactions/:id - membatalkan transaksi berstatus PENDING. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const user = await getAuthenticatedUser();
    requireRole(user, MANAGERIAL_ROLES);
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw ApiError.notFound("Transaction not found.");

    if (transaction.status !== TransactionStatus.PENDING) {
      throw ApiError.conflict(
        "Hanya transaksi berstatus PENDING yang dapat dibatalkan. Gunakan fitur refund untuk transaksi yang sudah selesai."
      );
    }

    const cancelled = await prisma.transaction.update({
      where: { id },
      data: { status: TransactionStatus.CANCELLED },
    });

    return apiSuccess(cancelled, "Transaction successfully cancelled.");
  });
}
