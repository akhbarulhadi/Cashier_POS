"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon, Trash2Icon, UserIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { CustomerPickerDialog } from "@/components/pos/CustomerPickerDialog";
import { HeldOrdersDialog } from "@/components/pos/HeldOrdersDialog";

export function CartPanel() {
  const items = useCartStore((s) => s.items);
  const customer = useCartStore((s) => s.customer);
  const globalDiscountAmount = useCartStore((s) => s.globalDiscountAmount);
  const taxPercent = useCartStore((s) => s.taxPercent);
  const heldOrders = useCartStore((s) => s.heldOrders);

  const increaseQuantity = useCartStore((s) => s.increaseQuantity);
  const decreaseQuantity = useCartStore((s) => s.decreaseQuantity);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const setItemDiscount = useCartStore((s) => s.setItemDiscount);
  const removeItem = useCartStore((s) => s.removeItem);
  const setCustomer = useCartStore((s) => s.setCustomer);
  const setGlobalDiscountAmount = useCartStore((s) => s.setGlobalDiscountAmount);
  const setTaxPercent = useCartStore((s) => s.setTaxPercent);
  const holdCurrentCart = useCartStore((s) => s.holdCurrentCart);

  const subtotal = useCartStore((s) => s.getSubtotal());
  const grandTotal = useCartStore((s) => s.getGrandTotal());
  const taxAmount = useCartStore((s) => s.getTaxAmount());

  const openPaymentDialog = useUiStore((s) => s.openPaymentDialog);

  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isHeldDialogOpen, setIsHeldDialogOpen] = useState(false);

  function handleHoldCart() {
    if (items.length === 0) return;
    const label = window.prompt("Label for held transaction:", `Order ${heldOrders.length + 1}`);
    if (label === null) return;
    holdCurrentCart(label.trim() || `Order ${heldOrders.length + 1}`);
    toast.success("Transaction successfully held.");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Customer */}
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <button
          type="button"
          onClick={() => setIsCustomerDialogOpen(true)}
          className="flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
        >
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="truncate">{customer ? customer.name : "No Customer"}</span>
        </button>
        {customer && (
          <Button variant="ghost" size="icon" onClick={() => setCustomer(null)} title="Remove customer">
            <XIcon className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Cart item list */}
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            Cart is still empty.
            <br />
            Click a product to add.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => {
              const lineTotal = item.sellPrice * item.quantity - item.discountAmount;
              return (
                <div key={item.productId} className="rounded-lg border p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(item.sellPrice)} / {item.unit}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => decreaseQuantity(item.productId)}
                      >
                        <MinusIcon className="h-3.5 w-3.5" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        max={item.availableStock}
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.productId, Number(e.target.value) || 0)}
                        className="h-7 w-14 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => increaseQuantity(item.productId)}
                      >
                        <PlusIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-sm font-semibold">{formatCurrency(lineTotal)}</p>
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Discount:</span>
                    <Input
                      type="number"
                      min={0}
                      value={item.discountAmount}
                      onChange={(e) => setItemDiscount(item.productId, Number(e.target.value) || 0)}
                      className="h-7 flex-1 text-xs"
                      placeholder="0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary & Actions */}
      <div className="border-t p-3">
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleHoldCart}
            disabled={items.length === 0}
            className="text-xs font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Hold Transaction
          </button>
          {heldOrders.length > 0 && (
            <button type="button" onClick={() => setIsHeldDialogOpen(true)}>
              <Badge variant="secondary" className="cursor-pointer">
                Held Transactions: {heldOrders.length}
              </Badge>
            </button>
          )}
        </div>

        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Global Discount</span>
            <Input
              type="number"
              min={0}
              value={globalDiscountAmount}
              onChange={(e) => setGlobalDiscountAmount(Number(e.target.value) || 0)}
              className="h-7 w-28 text-right text-xs"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Tax (%)</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={taxPercent}
              onChange={(e) => setTaxPercent(Number(e.target.value) || 0)}
              className="h-7 w-28 text-right text-xs"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Tax Amount</span>
            <span>{formatCurrency(taxAmount)}</span>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">Total Payable</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
        </div>

        <Button
          size="lg"
          className="mt-3 w-full"
          disabled={items.length === 0}
          onClick={openPaymentDialog}
        >
          Pay
        </Button>
      </div>

      <CustomerPickerDialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen} />
      <HeldOrdersDialog open={isHeldDialogOpen} onOpenChange={setIsHeldDialogOpen} />
    </div>
  );
}
