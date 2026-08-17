"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { RefundDialog } from "@/components/transactions/RefundDialog";

interface TransactionItem {
  id: string;
  productName: string;
  sku: string;
  sellPrice: string;
  costPrice: string;
  quantity: number;
  discountAmount: string;
  subtotal: string;
  refundedQty: number;
}

interface RefundRecord {
  id: string;
  reason: string;
  totalAmount: string;
  createdAt: string;
  handledBy: { fullName: string };
  items: Array<{ id: string; quantity: number; transactionItemId: string }>;
}

interface TransactionDetail {
  id: string;
  invoiceNumber: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  taxPercent: string;
  grandTotal: string;
  paidAmount: string;
  changeAmount: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  createdAt: string;
  cashier: { fullName: string };
  customer: { name: string; phone: string | null } | null;
  items: TransactionItem[];
  refunds: RefundRecord[];
}

const statusVariant: Record<string, BadgeProps["variant"]> = {
  COMPLETED: "success",
  PENDING: "warning",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "secondary",
  CANCELLED: "destructive",
};

export default function TransactionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const isManagerial = useAuthStore((s) => s.isManagerial());

  const [transaction, setTransaction] = useState<TransactionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);

  const fetchTransaction = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/transactions/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load transaction details.");
      }
      setTransaction(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  const canRefund =
    isManagerial &&
    (transaction?.status === "COMPLETED" || transaction?.status === "PARTIALLY_REFUNDED");

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
        <p className="text-muted-foreground">Transaction not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/transactions">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{transaction.invoiceNumber}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDate(transaction.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/print/receipt/${transaction.id}`, "_blank")}
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          {canRefund && (
            <Button variant="destructive" onClick={() => setRefundDialogOpen(true)}>
              <RotateCcw className="h-4 w-4" />
              Process Refund
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transaction Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusVariant[transaction.status] ?? "default"}>
                {transaction.status}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cashier</span>
              <span>{transaction.cashier.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Customer</span>
              <span>{transaction.customer?.name ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Method</span>
              <span>{transaction.paymentMethod}</span>
            </div>
            {transaction.notes && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Notes</span>
                <span className="text-right">{transaction.notes}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discount</span>
              <span>-{formatCurrency(transaction.discountAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({transaction.taxPercent}%)</span>
              <span>{formatCurrency(transaction.taxAmount)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatCurrency(transaction.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Paid Amount</span>
              <span>{formatCurrency(transaction.paidAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Change</span>
              <span>{formatCurrency(transaction.changeAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Refunded</TableHead>
                  <TableHead>Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transaction.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{formatCurrency(item.sellPrice)}</TableCell>
                    <TableCell>{item.quantity}</TableCell>
                    <TableCell>{item.refundedQty}</TableCell>
                    <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {transaction.refunds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Refund History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {transaction.refunds.map((refund) => (
              <div key={refund.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{formatCurrency(refund.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(refund.createdAt)}
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{refund.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Handled by {refund.handledBy.fullName}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RefundDialog
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        transactionId={transaction.id}
        items={transaction.items}
        onSuccess={fetchTransaction}
      />
    </div>
  );
}
