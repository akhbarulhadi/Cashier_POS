"use client";

import { create } from "zustand";

/**
 * Zustand Store - Sesi UI Umum
 * ============================================================================
 * Menyimpan state UI lintas halaman yang tidak berhubungan langsung dengan
 * data keranjang, seperti status sidebar, filter pencarian POS, dan dialog
 * yang sedang terbuka. Dipisah dari `useCartStore` agar setiap store punya
 * tanggung jawab (concern) yang jelas & tidak saling memicu re-render.
 * ============================================================================
 */

interface UiState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (value: boolean) => void;

  isMobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (value: boolean) => void;

  // Filter & pencarian di halaman POS
  posSearchQuery: string;
  setPosSearchQuery: (value: string) => void;
  posSelectedCategoryId: string | null;
  setPosSelectedCategoryId: (id: string | null) => void;

  // Dialog pembayaran & struk
  isPaymentDialogOpen: boolean;
  openPaymentDialog: () => void;
  closePaymentDialog: () => void;

  lastCompletedTransactionId: string | null;
  setLastCompletedTransactionId: (id: string | null) => void;

  isReceiptPreviewOpen: boolean;
  openReceiptPreview: (transactionId: string) => void;
  closeReceiptPreview: () => void;
}

export const useUiStore = create<UiState>()((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setSidebarCollapsed: (value) => set({ isSidebarCollapsed: value }),

  isMobileSidebarOpen: false,
  toggleMobileSidebar: () => set((s) => ({ isMobileSidebarOpen: !s.isMobileSidebarOpen })),
  setMobileSidebarOpen: (value) => set({ isMobileSidebarOpen: value }),

  posSearchQuery: "",
  setPosSearchQuery: (value) => set({ posSearchQuery: value }),
  posSelectedCategoryId: null,
  setPosSelectedCategoryId: (id) => set({ posSelectedCategoryId: id }),

  isPaymentDialogOpen: false,
  openPaymentDialog: () => set({ isPaymentDialogOpen: true }),
  closePaymentDialog: () => set({ isPaymentDialogOpen: false }),

  lastCompletedTransactionId: null,
  setLastCompletedTransactionId: (id) => set({ lastCompletedTransactionId: id }),

  isReceiptPreviewOpen: false,
  openReceiptPreview: (transactionId) =>
    set({ isReceiptPreviewOpen: true, lastCompletedTransactionId: transactionId }),
  closeReceiptPreview: () => set({ isReceiptPreviewOpen: false }),
}));
