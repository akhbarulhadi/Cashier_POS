"use client";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";

export interface RefundableItem {
  id: string;
  productName: string;
  sellPrice: string;
  quantity: number;
  refundedQty: number;
}

interface RefundDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  items: RefundableItem[];
  onSuccess?: () => void;
}

export function RefundDialog({
  open,
  onOpenChange,
  transactionId,
  items,
  onSuccess,
}: RefundDialogProps) {
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [reason, setReason] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setMode("full");
      setReason("");
      setQuantities({});
    }
  }, [open]);

  const remainingQty = (item: RefundableItem) => item.quantity - item.refundedQty;

  const toggleItem = (item: RefundableItem, checked: boolean) => {
    setQuantities((prev) => {
      const next = { ...prev };
      if (checked) {
        next[item.id] = remainingQty(item);
      } else {
        delete next[item.id];
      }
      return next;
    });
  };

  const updateQuantity = (item: RefundableItem, value: number) => {
    const max = remainingQty(item);
    const clamped = Math.max(1, Math.min(max, Number.isNaN(value) ? 1 : value));
    setQuantities((prev) => ({ ...prev, [item.id]: clamped }));
  };

  const handleSubmit = async () => {
    if (reason.trim().length < 5) {
      toast.error("Refund reason must be at least 5 characters.");
      return;
    }

    if (mode === "partial" && Object.keys(quantities).length === 0) {
      toast.error("Select at least one item for partial refund.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload =
        mode === "full"
          ? { reason }
          : {
              reason,
              items: Object.entries(quantities).map(([transactionItemId, quantity]) => ({
                transactionItemId,
                quantity,
              })),
            };

      const res = await fetch(`/api/transactions/${transactionId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to process refund.");
      }

      toast.success("Refund successfully processed.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const refundableItems = items.filter((item) => remainingQty(item) > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
          <DialogDescription>
            Select refund type and provide a clear reason.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Refund Reason</Label>
            <Textarea
              id="reason"
              placeholder="Example: Damaged goods/manufacturing defect."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as "full" | "partial")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="full">Full Refund</TabsTrigger>
              <TabsTrigger value="partial">Partial Refund</TabsTrigger>
            </TabsList>

            <TabsContent value="full">
              <p className="text-sm text-muted-foreground">
                All items in this transaction will be fully refunded.
              </p>
            </TabsContent>

            <TabsContent value="partial" className="space-y-3">
              {refundableItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No items left to refund.
                </p>
              ) : (
                refundableItems.map((item) => {
                  const max = remainingQty(item);
                  const checked = item.id in quantities;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => toggleItem(item, e.target.checked)}
                          className="h-4 w-4 rounded border-input"
                        />
                        <div>
                          <p className="text-sm font-medium">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.sellPrice)} x {max} units left
                          </p>
                        </div>
                      </div>
                      <Input
                        type="number"
                        min={1}
                        max={max}
                        className="w-20"
                        disabled={!checked}
                        value={quantities[item.id] ?? ""}
                        onChange={(e) => updateQuantity(item, Number(e.target.value))}
                      />
                    </div>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Processing..." : "Process Refund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
