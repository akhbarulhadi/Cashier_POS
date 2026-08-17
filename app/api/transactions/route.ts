import { NextRequest } from "next/server";
import { Prisma, StockMovementType, TransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { checkoutSchema, transactionQuerySchema } from "@/lib/validations/transaction.schema";

export const dynamic = "force-dynamic";

/** Menghasilkan nomor invoice unik: INV-YYYYMMDD-XXXXXX (tanggal + random alfanumerik). */
function generateInvoiceNumber(): string {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${datePart}-${randomPart}`;
}

/** GET /api/transactions - riwayat transaksi dengan server-side pagination & filter */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();

    const query = transactionQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    // Cashier hanya boleh melihat transaksi miliknya sendiri, kecuali OWNER/ADMIN.
    const isManagerial = currentUser.role === "OWNER" || currentUser.role === "ADMIN";

    const where: Prisma.TransactionWhereInput = {
      ...(isManagerial ? {} : { cashierId: currentUser.id }),
      ...(query.cashierId && isManagerial ? { cashierId: query.cashierId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.search
        ? { invoiceNumber: { contains: query.search, mode: "insensitive" } }
        : {}),
      ...(query.startDate || query.endDate
        ? {
            createdAt: {
              ...(query.startDate ? { gte: query.startDate } : {}),
              ...(query.endDate ? { lte: query.endDate } : {}),
            },
          }
        : {}),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          cashier: { select: { id: true, fullName: true } },
          customer: { select: { id: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return apiSuccess(transactions, "Riwayat transaksi berhasil diambil.", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  });
}

/**
 * POST /api/transactions - CHECKOUT (inti sistem POS)
 * ------------------------------------------------------------------------
 * WAJIB atomic: pembuatan transaksi header, item, mutasi stok, dan update
 * statistik customer harus sukses/gagal bersamaan (Prisma $transaction).
 * Stok dikurangi menggunakan conditional atomic update (`updateMany` dengan
 * `stock: { gte: qty }`) untuk mencegah race condition / stok minus saat ada
 * beberapa cashier checkout bersamaan pada product yang sama.
 */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const cashier = await getAuthenticatedUser();

    const body = await request.json();
    const input = checkoutSchema.parse(body);

    const transaction = await prisma.$transaction(async (tx) => {
      // 1) Ambil data product terbaru untuk seluruh item di keranjang
      const productIds = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map((p) => [p.id, p]));

      // 2) Validasi ketersediaan & status setiap product
      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product || product.deletedAt) {
          throw ApiError.badRequest(`Product dengan ID ${item.productId} tidak ditemukan.`);
        }
        if (!product.isActive) {
          throw ApiError.badRequest(`Product "${product.name}" sedang tidak aktif dijual.`);
        }
      }

      // 3) Hitung subtotal & siapkan payload item (snapshot harga & HPP)
      let subtotal = new Prisma.Decimal(0);
      const itemsPayload = input.items.map((item) => {
        const product = productMap.get(item.productId)!;
        const lineGross = product.sellPrice.mul(item.quantity);
        const lineSubtotal = lineGross.sub(item.discountAmount);

        if (lineSubtotal.lt(0)) {
          throw ApiError.badRequest(
            `Diskon untuk product "${product.name}" melebihi total harga barisnya.`
          );
        }

        subtotal = subtotal.add(lineSubtotal);

        return {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          costPrice: product.costPrice,
          sellPrice: product.sellPrice,
          quantity: item.quantity,
          discountAmount: new Prisma.Decimal(item.discountAmount),
          subtotal: lineSubtotal,
        };
      });

      const globalDiscount = new Prisma.Decimal(input.discountAmount);
      if (globalDiscount.gt(subtotal)) {
        throw ApiError.badRequest("Diskon global tidak boleh melebihi subtotal transaksi.");
      }

      const afterDiscount = subtotal.sub(globalDiscount);
      const taxAmount = afterDiscount.mul(input.taxPercent).div(100);
      const grandTotal = afterDiscount.add(taxAmount);

      const paidAmount = new Prisma.Decimal(input.paidAmount);
      if (paidAmount.lt(grandTotal)) {
        throw ApiError.unprocessable(
          `Nominal pembayaran (${paidAmount.toString()}) kurang dari total tagihan (${grandTotal.toString()}).`
        );
      }
      const changeAmount = paidAmount.sub(grandTotal);

      // 4) Buat header transaksi
      const createdTransaction = await tx.transaction.create({
        data: {
          invoiceNumber: generateInvoiceNumber(),
          customerId: input.customerId ?? null,
          cashierId: cashier.id,
          subtotal,
          discountAmount: globalDiscount,
          taxAmount,
          taxPercent: input.taxPercent,
          grandTotal,
          paymentMethod: input.paymentMethod,
          paidAmount,
          changeAmount,
          status: TransactionStatus.COMPLETED,
          notes: input.notes,
          items: { create: itemsPayload },
        },
        include: { items: true },
      });

      // 5) Potong stok secara ATOMIC per product + catat StockMovement
      for (const item of input.items) {
        const product = productMap.get(item.productId)!;

        const updateResult = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });

        if (updateResult.count === 0) {
          // Melempar error di sini akan otomatis rollback SELURUH transaksi Prisma,
          // termasuk header & item yang baru saja dibuat di atas.
          throw ApiError.unprocessable(
            `Stok product "${product.name}" tidak mencukupi saat checkout (kemungkinan diserobot transaksi lain).`
          );
        }

        const refreshedProduct = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });
        const stockAfter = refreshedProduct.stock;
        const stockBefore = stockAfter + item.quantity;

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.SALE_OUT,
            quantity: item.quantity,
            stockBefore,
            stockAfter,
            referenceId: createdTransaction.id,
            note: `Penjualan - Invoice ${createdTransaction.invoiceNumber}`,
            userId: cashier.id,
          },
        });
      }

      // 6) Update statistik customer (jika ada)
      if (input.customerId) {
        await tx.customer.update({
          where: { id: input.customerId },
          data: {
            totalSpent: { increment: grandTotal },
            totalTransactions: { increment: 1 },
          },
        });
      }

      return createdTransaction;
    });

    const fullTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        items: true,
        cashier: { select: { id: true, fullName: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    return apiSuccess(fullTransaction, "Transaction successful.diselesaikan.", 201);
  });
}
