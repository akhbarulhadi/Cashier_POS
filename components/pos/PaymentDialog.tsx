"use client";

import { useState } from "react";
import type { PaymentMethod } from "@prisma/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  DEBIT_CARD: "Debit Card",
  CREDIT_CARD: "Credit Card",
  QRIS: "QRIS",
  E_WALLET: "E-Wallet",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

export function PaymentDialog() {
  const isOpen = useUiStore((s) => s.isPaymentDialogOpen);
  const closeDialog = useUiStore((s) => s.closePaymentDialog);
  const setLastCompletedTransactionId = useUiStore((s) => s.setLastCompletedTransactionId);

  const grandTotal = useCartStore((s) => s.getGrandTotal());
  const changeAmount = useCartStore((s) => s.getChangeAmount());
  const paymentMethod = useCartStore((s) => s.paymentMethod);
  const paidAmount = useCartStore((s) => s.paidAmount);
  const notes = useCartStore((s) => s.notes);

  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod);
  const setPaidAmount = useCartStore((s) => s.setPaidAmount);
  const setNotes = useCartStore((s) => s.setNotes);
  const buildCheckoutPayload = useCartStore((s) => s.buildCheckoutPayload);
  const clearCart = useCartStore((s) => s.clearCart);

  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (paidAmount < grandTotal) {
      toast.error("Paid amount is less than total payable.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCheckoutPayload()),
      });
      const json = await res.json();

      if (!res.ok || !json?.success) {
        toast.error(json?.message ?? "Failed to complete transaction.");
        return;
      }

      const transactionId: string = json.data.id;
      clearCart();
      closeDialog();
      setLastCompletedTransactionId(transactionId);
      toast.success("Transaction successfully completed.");
      window.open(`/print/receipt/${transactionId}`, "_blank");
    } catch {
      toast.error("Network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Payment</DialogTitle>
          <DialogDescription>Complete the payment to finalize this transaction.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between rounded-lg bg-muted p-3">
          <span className="text-sm font-medium text-muted-foreground">Total Payable</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Paid Amount</Label>
            <Input
              type="number"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Change</span>
            <span className="text-lg font-semibold text-success">{formatCurrency(changeAmount)}</span>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes for this transaction..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={closeDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Complete Transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
