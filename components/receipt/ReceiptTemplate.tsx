import { formatCurrency, formatDate } from "@/lib/utils";


const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "Cash",
  DEBIT_CARD: "Debit Card",
  CREDIT_CARD: "Credit Card",
  QRIS: "QRIS",
  E_WALLET: "E-Wallet",
  BANK_TRANSFER: "Bank Transfer",
  OTHER: "Other",
};

export interface ReceiptTransactionItem {
  id: string;
  productName: string;
  sku: string;
  sellPrice: number;
  quantity: number;
  discountAmount: number;
  subtotal: number;
}

export interface ReceiptTransaction {
  id: string;
  invoiceNumber: string;
  createdAt: string | Date;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  taxPercent: number;
  grandTotal: number;
  paymentMethod: string;
  paidAmount: number;
  changeAmount: number;
  notes: string | null;
  items: ReceiptTransactionItem[];
  cashier: { fullName: string } | null;
  customer: { name: string; phone?: string | null } | null;
}

export interface ReceiptStoreSettings {
  storeName: string;
  address?: string | null;
  phone?: string | null;
  receiptFooter?: string | null;
}

interface ReceiptTemplateProps {
  transaction: ReceiptTransaction;
  storeSettings: ReceiptStoreSettings | null;
  paperWidth?: "80mm" | "58mm";
}

export function ReceiptTemplate({
  transaction,
  storeSettings,
  paperWidth = "80mm",
}: ReceiptTemplateProps) {
  const storeName = storeSettings?.storeName ?? "My Store";
  const footerText = storeSettings?.receiptFooter ?? "Thank you for your visit!";

  const widthClass = paperWidth === "58mm" ? "max-w-[230px] text-[10px]" : "max-w-[320px] text-xs";

  return (
    <div
      id="receipt-content"
      className={`receipt-print-area mx-auto w-full bg-white p-4 font-mono text-black ${widthClass}`}
    >
      <div className="text-center">
        <p className="text-base font-bold">{storeName}</p>
        {storeSettings?.address && <p>{storeSettings.address}</p>}
        {storeSettings?.phone && <p>{storeSettings.phone}</p>}
      </div>

      <hr className="my-2 border-dashed border-black" />

      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Invoice No.</span>
          <span>{transaction.invoiceNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDate(transaction.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{transaction.cashier?.fullName ?? "-"}</span>
        </div>
        {transaction.customer && (
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{transaction.customer.name}</span>
          </div>
        )}
      </div>

      <hr className="my-2 border-dashed border-black" />

      <div className="space-y-1.5">
        {transaction.items.map((item) => (
          <div key={item.id}>
            <p className="font-semibold">{item.productName}</p>
            <div className="flex justify-between">
              <span>
                {item.quantity} x {formatCurrency(item.sellPrice)}
              </span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
            {item.discountAmount > 0 && (
              <div className="flex justify-between text-[10px]">
                <span>Discount</span>
                <span>-{formatCurrency(item.discountAmount)}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <hr className="my-2 border-dashed border-black" />

      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(transaction.subtotal)}</span>
        </div>
        {transaction.discountAmount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatCurrency(transaction.discountAmount)}</span>
          </div>
        )}
        {transaction.taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax ({transaction.taxPercent}%)</span>
            <span>{formatCurrency(transaction.taxAmount)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(transaction.grandTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>{PAYMENT_METHOD_LABELS[transaction.paymentMethod] ?? transaction.paymentMethod}</span>
          <span></span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{formatCurrency(transaction.paidAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Change</span>
          <span>{formatCurrency(transaction.changeAmount)}</span>
        </div>
      </div>

      <hr className="my-2 border-dashed border-black" />

      <p className="text-center">{footerText}</p>
    </div>
  );
}
