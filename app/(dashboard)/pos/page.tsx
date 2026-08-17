import { ProductGrid } from "@/components/pos/ProductGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { PaymentDialog } from "@/components/pos/PaymentDialog";

export const metadata = {
  title: "Cashier (POS) - POS Enterprise",
};

export default function PosPage() {
  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-6.5rem)] lg:flex-row">
      <div className="flex flex-col h-[65vh] lg:h-auto lg:flex-1 overflow-hidden rounded-xl border bg-card p-2 sm:p-4 lg:w-[65%] lg:flex-none">
        <ProductGrid />
      </div>

      <div className="flex flex-col h-[60vh] lg:h-auto overflow-hidden rounded-xl border bg-card lg:w-[35%] lg:flex-none">
        <CartPanel />
      </div>

      <PaymentDialog />
    </div>
  );
}
