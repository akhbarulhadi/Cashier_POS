"use client";

import { useEffect, useState } from "react";

/** Hook debounce generik - dipakai untuk pencarian instan produk/pelanggan/transaksi. */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
