import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ReceiptView } from "@/components/receipt/ReceiptView";

interface PrintReceiptPageProps {
  params: { id: string };
}

export default async function PrintReceiptPage({ params }: PrintReceiptPageProps) {
  const { id } = params;

  const [transaction, storeSettings] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id },
      include: {
        items: true,
        cashier: { select: { fullName: true } },
        customer: true,
      },
    }),
    prisma.storeSetting.findFirst(),
  ]);

  if (!transaction) {
    notFound();
  }

  return (
    <ReceiptView
      transaction={{
        id: transaction.id,
        invoiceNumber: transaction.invoiceNumber,
        createdAt: transaction.createdAt,
        subtotal: Number(transaction.subtotal),
        discountAmount: Number(transaction.discountAmount),
        taxAmount: Number(transaction.taxAmount),
        taxPercent: Number(transaction.taxPercent),
        grandTotal: Number(transaction.grandTotal),
        paymentMethod: transaction.paymentMethod,
        paidAmount: Number(transaction.paidAmount),
        changeAmount: Number(transaction.changeAmount),
        notes: transaction.notes,
        cashier: transaction.cashier,
        customer: transaction.customer
          ? { name: transaction.customer.name, phone: transaction.customer.phone }
          : null,
        items: transaction.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          sku: item.sku,
          sellPrice: Number(item.sellPrice),
          quantity: item.quantity,
          discountAmount: Number(item.discountAmount),
          subtotal: Number(item.subtotal),
        })),
      }}
      storeSettings={
        storeSettings
          ? {
              storeName: storeSettings.storeName,
              address: storeSettings.address,
              phone: storeSettings.phone,
              receiptFooter: storeSettings.receiptFooter,
            }
          : null
      }
    />
  );
}
