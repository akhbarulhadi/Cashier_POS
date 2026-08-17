import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format angka menjadi mata uang Rupiah, contoh: 15000 -> "Rp 15.000". */
export function formatCurrency(value: number | string, options?: { withSymbol?: boolean }) {
  const numeric = typeof value === "string" ? Number(value) : value;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(numeric) ? numeric : 0);

  return options?.withSymbol === false ? formatted : `Rp ${formatted}`;
}

/** Format tanggal ke format Indonesia yang mudah dibaca. */
export function formatDate(date: Date | string, withTime = true) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: withTime ? "short" : undefined,
  }).format(d);
}

/** Debounce sederhana untuk pencarian instan (dipakai di POS & tabel produk). */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 400) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
