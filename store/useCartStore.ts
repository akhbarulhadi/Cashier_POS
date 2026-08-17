"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PaymentMethod } from "@prisma/client";

/** Zustand Store - Keranjang Belanja & Sesi Kasir (POS) */

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  barcode?: string | null;
  imageUrl?: string | null;
  unit: string;
  sellPrice: number;
  costPrice: number;
  availableStock: number;
  quantity: number;
  discountAmount: number;
}

export interface SelectedCustomer {
  id: string;
  name: string;
  phone?: string | null;
}

/** Representasi keranjang yang "ditahan/parkir" sementara oleh kasir. */
export interface HeldOrder {
  id: string;
  label: string;
  savedAt: string; // ISO string
  items: CartItem[];
  customer: SelectedCustomer | null;
  globalDiscountAmount: number;
  notes: string;
}

interface CartState {
  items: CartItem[];
  customer: SelectedCustomer | null;

  /** Diskon nominal (Rupiah) untuk keseluruhan transaksi. */
  globalDiscountAmount: number;
  /** Persentase PPN, contoh: 11 untuk 11%. */
  taxPercent: number;

  paymentMethod: PaymentMethod;
  paidAmount: number;
  notes: string;

  heldOrders: HeldOrder[];

  // ACTIONS - Manajemen Item
  addItem: (product: Omit<CartItem, "quantity" | "discountAmount">, qty?: number) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setItemDiscount: (productId: string, discountAmount: number) => void;
  removeItem: (productId: string) => void;

  // ACTIONS - Pelanggan & Diskon/Pajak Global
  setCustomer: (customer: SelectedCustomer | null) => void;
  setGlobalDiscountAmount: (amount: number) => void;
  setTaxPercent: (percent: number) => void;

  // ACTIONS - Pembayaran
  setPaymentMethod: (method: PaymentMethod) => void;
  setPaidAmount: (amount: number) => void;
  setNotes: (notes: string) => void;

  // ACTIONS - Hold/Park Order (fitur "simpan sementara" transaksi)
  holdCurrentCart: (label: string) => void;
  resumeHeldOrder: (id: string) => void;
  deleteHeldOrder: (id: string) => void;

  // ACTIONS - Reset
  clearCart: () => void;

  // ---------------------------------------------------------------------
  getSubtotal: () => number;
  getTotalItemDiscount: () => number;
  getTotalAfterDiscount: () => number;
  getTaxAmount: () => number;
  getGrandTotal: () => number;
  getChangeAmount: () => number;
  getTotalQuantity: () => number;
  buildCheckoutPayload: () => {
    customerId: string | null;
    items: { productId: string; quantity: number; discountAmount: number }[];
    discountAmount: number;
    taxPercent: number;
    paymentMethod: PaymentMethod;
    paidAmount: number;
    notes?: string;
  };
}

const initialTransientState = {
  items: [] as CartItem[],
  customer: null as SelectedCustomer | null,
  globalDiscountAmount: 0,
  taxPercent: 0,
  paymentMethod: "CASH" as PaymentMethod,
  paidAmount: 0,
  notes: "",
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ...initialTransientState,
      heldOrders: [],

      addItem: (product, qty = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === product.productId);

          if (existing) {
            const newQty = Math.min(existing.quantity + qty, existing.availableStock);
            return {
              items: state.items.map((i) =>
                i.productId === product.productId ? { ...i, quantity: newQty } : i
              ),
            };
          }

          const safeQty = Math.max(1, Math.min(qty, product.availableStock || qty));
          return {
            items: [...state.items, { ...product, quantity: safeQty, discountAmount: 0 }],
          };
        });
      },

      increaseQuantity: (productId) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, quantity: Math.min(i.quantity + 1, i.availableStock) }
              : i
          ),
        }));
      },

      decreaseQuantity: (productId) => {
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId ? { ...i, quantity: i.quantity - 1 } : i
            )
            .filter((i) => i.quantity > 0),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items
            .map((i) =>
              i.productId === productId
                ? { ...i, quantity: Math.max(0, Math.min(quantity, i.availableStock)) }
                : i
            )
            .filter((i) => i.quantity > 0),
        }));
      },

      setItemDiscount: (productId, discountAmount) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId
              ? { ...i, discountAmount: Math.max(0, discountAmount) }
              : i
          ),
        }));
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      setCustomer: (customer) => set({ customer }),
      setGlobalDiscountAmount: (amount) => set({ globalDiscountAmount: Math.max(0, amount) }),
      setTaxPercent: (percent) => set({ taxPercent: Math.max(0, Math.min(100, percent)) }),

      setPaymentMethod: (method) => set({ paymentMethod: method }),
      setPaidAmount: (amount) => set({ paidAmount: Math.max(0, amount) }),
      setNotes: (notes) => set({ notes }),

      holdCurrentCart: (label) => {
        const state = get();
        if (state.items.length === 0) return;

        const heldOrder: HeldOrder = {
          id: crypto.randomUUID(),
          label: label || `Order ${state.heldOrders.length + 1}`,
          savedAt: new Date().toISOString(),
          items: state.items,
          customer: state.customer,
          globalDiscountAmount: state.globalDiscountAmount,
          notes: state.notes,
        };

        set({
          heldOrders: [...state.heldOrders, heldOrder],
          ...initialTransientState,
        });
      },

      resumeHeldOrder: (id) => {
        const state = get();
        const held = state.heldOrders.find((h) => h.id === id);
        if (!held) return;

        set({
          items: held.items,
          customer: held.customer,
          globalDiscountAmount: held.globalDiscountAmount,
          notes: held.notes,
          taxPercent: state.taxPercent,
          paymentMethod: "CASH",
          paidAmount: 0,
          heldOrders: state.heldOrders.filter((h) => h.id !== id),
        });
      },

      deleteHeldOrder: (id) => {
        set((state) => ({
          heldOrders: state.heldOrders.filter((h) => h.id !== id),
        }));
      },

      clearCart: () => set({ ...initialTransientState }),

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.sellPrice * item.quantity - item.discountAmount,
          0
        );
      },

      getTotalItemDiscount: () => {
        return get().items.reduce((sum, item) => sum + item.discountAmount, 0);
      },

      getTotalAfterDiscount: () => {
        const state = get();
        return Math.max(0, state.getSubtotal() - state.globalDiscountAmount);
      },

      getTaxAmount: () => {
        const state = get();
        return (state.getTotalAfterDiscount() * state.taxPercent) / 100;
      },

      getGrandTotal: () => {
        const state = get();
        return state.getTotalAfterDiscount() + state.getTaxAmount();
      },

      getChangeAmount: () => {
        const state = get();
        return Math.max(0, state.paidAmount - state.getGrandTotal());
      },

      getTotalQuantity: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      buildCheckoutPayload: () => {
        const state = get();
        return {
          customerId: state.customer?.id ?? null,
          items: state.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            discountAmount: i.discountAmount,
          })),
          discountAmount: state.globalDiscountAmount,
          taxPercent: state.taxPercent,
          paymentMethod: state.paymentMethod,
          paidAmount: state.paidAmount,
          notes: state.notes || undefined,
        };
      },
    }),
    {
      name: "pos-cart-storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        items: state.items,
        customer: state.customer,
        globalDiscountAmount: state.globalDiscountAmount,
        taxPercent: state.taxPercent,
        paymentMethod: state.paymentMethod,
        notes: state.notes,
        heldOrders: state.heldOrders,
      }),
    }
  )
);
