"use client";

import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";

interface HeldOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HeldOrdersDialog({ open, onOpenChange }: HeldOrdersDialogProps) {
  const heldOrders = useCartStore((s) => s.heldOrders);
  const items = useCartStore((s) => s.items);
  const resumeHeldOrder = useCartStore((s) => s.resumeHeldOrder);
  const deleteHeldOrder = useCartStore((s) => s.deleteHeldOrder);

  function handleResume(id: string) {
    if (items.length > 0) {
      const confirmed = window.confirm(
        "The cart is not empty. Resuming a held transaction will overwrite the active cart. Continue?"
      );
      if (!confirmed) return;
    }
    resumeHeldOrder(id);
    toast.success("Held transaction resumed.");
    onOpenChange(false);
  }

  function handleDelete(id: string) {
    const confirmed = window.confirm("Delete this held transaction permanently?");
    if (!confirmed) return;
    deleteHeldOrder(id);
    toast.success("Held transaction deleted.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Held Transactions</DialogTitle>
          <DialogDescription>List of temporarily held transactions.</DialogDescription>
        </DialogHeader>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {heldOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No held transactions yet.</p>
          ) : (
            heldOrders.map((held) => {
              const totalEstimate = held.items.reduce(
                (sum, item) => sum + item.sellPrice * item.quantity - item.discountAmount,
                held.globalDiscountAmount * -1
              );
              const totalItems = held.items.reduce((sum, item) => sum + item.quantity, 0);

              return (
                <div key={held.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{held.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(held.savedAt)}</p>
                    <p className="text-xs text-muted-foreground">
                      {totalItems} item · {formatCurrency(Math.max(0, totalEstimate))}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button size="sm" onClick={() => handleResume(held.id)}>
                      Resume
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(held.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
