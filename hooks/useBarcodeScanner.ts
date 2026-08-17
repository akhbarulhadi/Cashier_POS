import { useEffect, useRef } from "react";

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  timeout?: number;
}

export function useBarcodeScanner({ onScan, timeout = 50 }: UseBarcodeScannerProps) {
  const buffer = useRef("");
  const lastKeyTime = useRef<number>(Date.now());

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;

      if (timeDiff > timeout) {
        buffer.current = "";
      }

      lastKeyTime.current = currentTime;

      if (e.key === "Enter") {
        if (buffer.current.length > 2) {
          onScan(buffer.current);
          buffer.current = "";

          if (timeDiff <= timeout) {
            e.preventDefault();
          }
        }
        return;
      }

      if (e.key.length === 1) {
        buffer.current += e.key;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onScan, timeout]);
}
