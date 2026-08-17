import { NextRequest } from "next/server";
import { Prisma, StockMovementType, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser, requireRole, MANAGERIAL_ROLES } from "@/lib/auth-helpers";
import { refundTransactionSchema } from "@/lib/validations/transaction.schema";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** POST /api/transactions/:id/refund */
export async function POST(request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const handledBy = await getAuthenticatedUser();
    requireRole(handledBy, MANAGERIAL_ROLES);
    const { id } = await params;

    const body = await request.json();
    const input = refundTransactionSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!transaction) throw ApiError.notFound("Transaction not found.");

      if (
        transaction.status !== TransactionStatus.COMPLETED &&
        transaction.status !== TransactionStatus.PARTIALLY_REFUNDED
      ) {
        throw ApiError.conflict(
          `Transaksi dengan status ${transaction.status} tidak dapat direfund.`
        );
      }

      const refundPlan = input.items?.length
        ? input.items
        : transaction.items
          .filter((it) => it.refundedQty < it.quantity)
          .map((it) => ({
            transactionItemId: it.id,
            quantity: it.quantity - it.refundedQty,
          }));

      if (refundPlan.length === 0) {
        throw ApiError.conflict("Tidak ada item yang tersisa untuk direfund.");
      }

      let totalRefundAmount = new Prisma.Decimal(0);
      const refundItemsPayload: {
        transactionItemId: string;
        productId: string;
        quantity: number;
        amount: Prisma.Decimal;
      }[] = [];

      for (const plan of refundPlan) {
        const transactionItem = transaction.items.find(
          (it) => it.id === plan.transactionItemId
        );
        if (!transactionItem) {
          throw ApiError.badRequest(
            `Item transaksi dengan ID ${plan.transactionItemId} tidak ditemukan pada transaksi ini.`
          );
        }

        const remainingQty = transactionItem.quantity - transactionItem.refundedQty;
        if (plan.quantity > remainingQty) {
          throw ApiError.unprocessable(
            `Kuantitas refund (${plan.quantity}) untuk "${transactionItem.productName}" melebihi sisa yang dapat direfund (${remainingQty}).`
          );
        }

        // Harga rata-rata per unit (memperhitungkan diskon per baris) dipakai
        const avgUnitPrice = transactionItem.subtotal.div(transactionItem.quantity);
        const refundAmount = avgUnitPrice.mul(plan.quantity);

        totalRefundAmount = totalRefundAmount.add(refundAmount);

        refundItemsPayload.push({
          transactionItemId: transactionItem.id,
          productId: transactionItem.productId,
          quantity: plan.quantity,
          amount: refundAmount,
        });

        // Update kuantitas yang sudah direfund pada item transaksi
        await tx.transactionItem.update({
          where: { id: transactionItem.id },
          data: { refundedQty: { increment: plan.quantity } },
        });

        // Kembalikan stok product + catat mutasi stok REFUND_IN
        const updatedProduct = await tx.product.update({
          where: { id: transactionItem.productId },
          data: { stock: { increment: plan.quantity } },
        });

        await tx.stockMovement.create({
          data: {
            productId: transactionItem.productId,
            type: StockMovementType.REFUND_IN,
            quantity: plan.quantity,
            stockBefore: updatedProduct.stock - plan.quantity,
            stockAfter: updatedProduct.stock,
            referenceId: transaction.id,
            note: `Refund - Invoice ${transaction.invoiceNumber}`,
            userId: handledBy.id,
          },
        });
      }

      const refund = await tx.refundTransaction.create({
        data: {
          transactionId: transaction.id,
          handledById: handledBy.id,
          reason: input.reason,
          totalAmount: totalRefundAmount,
          items: { create: refundItemsPayload },
        },
        include: { items: true },
      });

      const refreshedItems = await tx.transactionItem.findMany({
        where: { transactionId: transaction.id },
      });
      const isFullyRefunded = refreshedItems.every(
        (it) => it.refundedQty >= it.quantity
      );

      const updatedTransaction = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: isFullyRefunded
            ? TransactionStatus.REFUNDED
            : TransactionStatus.PARTIALLY_REFUNDED,
        },
      });

      if (transaction.customerId) {
        await tx.customer.update({
          where: { id: transaction.customerId },
          data: { totalSpent: { decrement: totalRefundAmount } },
        });
      }

      return { refund, transaction: updatedTransaction };
    });

    return apiSuccess(result, "Refund berhasil diproses.", 201);
  });
}
