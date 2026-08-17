import { useEffect, useRef } from "react";

interface UseBarcodeScannerProps {
  onScan: (barcode: string) => void;
  // Timeout in ms to determine if the keystrokes are coming from a scanner (very fast)
  // typical human typing is much slower than 30ms per char
  timeout?: number;
}

export function useBarcodeScanner({ onScan, timeout = 50 }: UseBarcodeScannerProps) {
  const buffer = useRef("");
  const lastKeyTime = useRef<number>(Date.now());

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if user is pressing modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      
      // If the target is an input or textarea, we should still capture the barcode, 
      // but if the scanner fires 'Enter', it might trigger a form submission.
      // We will let the scanner type into the input, but we ALSO capture it.
      
      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      
      // If time between keystrokes is too long, it's human typing. Reset buffer.
      if (timeDiff > timeout) {
        buffer.current = "";
      }
      
      lastKeyTime.current = currentTime;

      if (e.key === "Enter") {
        if (buffer.current.length > 2) { // Barcodes are usually > 2 chars
          onScan(buffer.current);
          buffer.current = "";
          
          // Optionally prevent default if the target is an input to stop form submission?
          // If we want to prevent default, we can do it here, but it might interfere with normal Enter.
          // Since we checked if buffer.length > 2 AND timeDiff <= timeout, it's very likely a scanner.
          if (timeDiff <= timeout) {
             e.preventDefault();
          }
        }
        return;
      }

      // Only accept printable characters (length 1)
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
