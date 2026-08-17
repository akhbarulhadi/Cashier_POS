"use client";

import { useEffect } from "react";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
  autoPrint?: boolean;
}

export function PrintButton({ autoPrint = false }: PrintButtonProps) {
  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <Button className="no-print gap-2" onClick={() => window.print()}>
      <PrinterIcon className="h-4 w-4" />
      Print Receipt
    </Button>
  );
}

