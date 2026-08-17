"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, Receipt, Star, AlertTriangle } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart, type SalesChartPoint } from "@/components/dashboard/SalesChart";
import { LowStockWidget, type LowStockProduct } from "@/components/dashboard/LowStockWidget";
import { BestSellersTable, type BestSellerRow } from "@/components/dashboard/BestSellersTable";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { formatCurrency } from "@/lib/utils";

interface SummaryData {
  netRevenue: string;
  totalTransactions: number;
  lowStockCount: number;
  bestSellingProduct: { productId: string; productName: string; quantitySold: number } | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function startOfMonthIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export default function DashboardPage() {
  const isAllowed = useRoleGuard(["OWNER", "ADMIN"]);

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [salesData, setSalesData] = useState<SalesChartPoint[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellerRow[]>([]);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isLoadingLowStock, setIsLoadingLowStock] = useState(true);
  const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true);

  useEffect(() => {
    if (!isAllowed) return;
    let isMounted = true;

    async function loadSummary() {
      try {
        const res = await fetch("/api/reports/summary");
        const json: ApiEnvelope<SummaryData> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load summary.");
        if (isMounted) setSummary(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load dashboard summary.");
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    }

    async function loadSales() {
      try {
        const res = await fetch("/api/reports/sales?groupBy=day");
        const json: ApiEnvelope<SalesChartPoint[]> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load sales trend.");
        if (isMounted) setSalesData(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load sales trend.");
      } finally {
        if (isMounted) setIsLoadingSales(false);
      }
    }

    async function loadLowStock() {
      try {
        const res = await fetch("/api/products/low-stock");
        const json: ApiEnvelope<LowStockProduct[]> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load low stock products.");
        if (isMounted) setLowStock(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load low stock products.");
      } finally {
        if (isMounted) setIsLoadingLowStock(false);
      }
    }

    async function loadBestSellers() {
      try {
        const params = new URLSearchParams({
          startDate: startOfMonthIso(),
          limit: "5",
        });
        const res = await fetch(`/api/reports/best-sellers?${params.toString()}`);
        const json: ApiEnvelope<BestSellerRow[]> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load best selling products.");
        if (isMounted) setBestSellers(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load best selling products.");
      } finally {
        if (isMounted) setIsLoadingBestSellers(false);
      }
    }

    loadSummary();
    loadSales();
    loadLowStock();
    loadBestSellers();

    return () => {
      isMounted = false;
    };
  }, [isAllowed]);

  if (!isAllowed) {
    return <AccessDenied message="Dashboard page can only be accessed by Store Owners and Admins." />;
  }

  const lowStockCount = summary?.lowStockCount ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Summary of your store's performance today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Revenue"
          value={summary ? formatCurrency(Number(summary.netRevenue)) : formatCurrency(0)}
          description="Net after refunds"
          icon={DollarSign}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Today's Transactions"
          value={summary ? String(summary.totalTransactions) : "0"}
          description="Completed transactions"
          icon={Receipt}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Best Selling Product"
          value={summary?.bestSellingProduct?.productName ?? "-"}
          description={
            summary?.bestSellingProduct ? `${summary.bestSellingProduct.quantitySold} units sold` : "No data yet"
          }
          icon={Star}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Low Stock"
          value={String(lowStockCount)}
          description="Products needing restock"
          icon={AlertTriangle}
          isLoading={isLoadingSummary}
          badge={
            lowStockCount > 0
              ? { label: "Needs attention", variant: "warning" }
              : { label: "Safe", variant: "secondary" }
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalesChart
            data={salesData}
            isLoading={isLoadingSales}
            title="Sales Trend (Last 30 Days)"
            description="Daily revenue from completed transactions"
          />
        </div>
        <LowStockWidget products={lowStock} isLoading={isLoadingLowStock} limit={6} />
      </div>

      <BestSellersTable
        data={bestSellers}
        isLoading={isLoadingBestSellers}
        title="Best Sellers This Month"
        description="Top 5 products by units sold this month"
      />
    </div>
  );
}
