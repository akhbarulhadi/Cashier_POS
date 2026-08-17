"use client";

import { useState } from "react";
import {
  ReceiptTemplate,
  ReceiptTransaction,
  ReceiptStoreSettings,
} from "@/components/receipt/ReceiptTemplate";
import { ReceiptActions } from "@/components/receipt/ReceiptActions";

interface ReceiptViewProps {
  transaction: ReceiptTransaction;
  storeSettings: ReceiptStoreSettings | null;
}

export function ReceiptView({ transaction, storeSettings }: ReceiptViewProps) {
  const [paperWidth, setPaperWidth] = useState<"80mm" | "58mm">("80mm");

  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-muted/30 py-8 print:min-h-0 print:bg-transparent print:p-0 print:block print:w-full">
      <ReceiptActions
        invoiceNumber={transaction.invoiceNumber}
        paperWidth={paperWidth}
        onPaperWidthChange={setPaperWidth}
      />

      <ReceiptTemplate
        transaction={transaction}
        storeSettings={storeSettings}
        paperWidth={paperWidth}
      />
    </div>
  );
}
