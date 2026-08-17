"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { DollarSign, Download, Printer, Receipt, TrendingDown, Users } from "lucide-react";
import { exportToCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/dashboard/StatCard";
import { SalesChart, type SalesChartPoint } from "@/components/dashboard/SalesChart";
import { BestSellersTable, type BestSellerRow } from "@/components/dashboard/BestSellersTable";
import { formatCurrency } from "@/lib/utils";

interface SummaryData {
  grossRevenue: string;
  totalRefunds: string;
  netRevenue: string;
  totalTransactions: number;
  averageTransactionValue: string;
  lowStockCount: number;
  totalCustomers: number;
  bestSellingProduct: { productId: string; productName: string; quantitySold: number } | null;
}

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

type GroupBy = "day" | "month";

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(() => toDateInputValue(startOfMonth()));
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));
  const [groupBy, setGroupBy] = useState<GroupBy>("day");

  const [appliedStart, setAppliedStart] = useState(startDate);
  const [appliedEnd, setAppliedEnd] = useState(endDate);

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [salesData, setSalesData] = useState<SalesChartPoint[]>([]);
  const [bestSellers, setBestSellers] = useState<BestSellerRow[]>([]);

  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingSales, setIsLoadingSales] = useState(true);
  const [isLoadingBestSellers, setIsLoadingBestSellers] = useState(true);

  const buildRange = useCallback(() => {
    const start = new Date(`${appliedStart}T00:00:00`);
    const end = new Date(`${appliedEnd}T23:59:59.999`);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [appliedStart, appliedEnd]);

  useEffect(() => {
    let isMounted = true;
    const { startDate: isoStart, endDate: isoEnd } = buildRange();

    async function loadSummary() {
      setIsLoadingSummary(true);
      try {
        const params = new URLSearchParams({ startDate: isoStart, endDate: isoEnd });
        const res = await fetch(`/api/reports/summary?${params.toString()}`);
        const json: ApiEnvelope<SummaryData> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load summary.");
        if (isMounted) setSummary(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load report summary.");
      } finally {
        if (isMounted) setIsLoadingSummary(false);
      }
    }

    async function loadSales() {
      setIsLoadingSales(true);
      try {
        const params = new URLSearchParams({ startDate: isoStart, endDate: isoEnd, groupBy });
        const res = await fetch(`/api/reports/sales?${params.toString()}`);
        const json: ApiEnvelope<SalesChartPoint[]> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load sales trends.");
        if (isMounted) setSalesData(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load sales trends.");
      } finally {
        if (isMounted) setIsLoadingSales(false);
      }
    }

    async function loadBestSellers() {
      setIsLoadingBestSellers(true);
      try {
        const params = new URLSearchParams({ startDate: isoStart, endDate: isoEnd, limit: "20" });
        const res = await fetch(`/api/reports/best-sellers?${params.toString()}`);
        const json: ApiEnvelope<BestSellerRow[]> = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || "Failed to load best-selling products.");
        if (isMounted) setBestSellers(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load best-selling products.");
      } finally {
        if (isMounted) setIsLoadingBestSellers(false);
      }
    }

    loadSummary();
    loadSales();
    loadBestSellers();

    return () => {
      isMounted = false;
    };
  }, [buildRange, groupBy]);

  function handleApplyFilter() {
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date cannot be after end date.");
      return;
    }
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function handleExportSalesCsv() {
    if (salesData.length === 0) {
      toast.info("No sales trend data to export.");
      return;
    }
    exportToCsv(
      `sales-trends-${appliedStart}-to-${appliedEnd}`,
      [
        { header: "Period", accessor: (r: SalesChartPoint) => new Date(r.period).toLocaleDateString("en-US") },
        { header: "Total Revenue (Rp)", accessor: (r: SalesChartPoint) => r.totalRevenue },
        { header: "Transaction Count", accessor: (r: SalesChartPoint) => r.totalTransactions },
      ],
      salesData
    );
    toast.success("Successfully exported sales trends to CSV.");
  }

  function handleExportBestSellersCsv() {
    if (bestSellers.length === 0) {
      toast.info("No best-selling product data to export.");
      return;
    }
    exportToCsv(
      `best-sellers-${appliedStart}-to-${appliedEnd}`,
      [
        { header: "Product Name", accessor: (r: BestSellerRow) => r.productName },
        { header: "SKU", accessor: (r: BestSellerRow) => r.sku },
        { header: "Units Sold", accessor: (r: BestSellerRow) => r.quantitySold },
        { header: "Total Revenue (Rp)", accessor: (r: BestSellerRow) => Number(r.totalRevenue) },
        { header: "Current Stock", accessor: (r: BestSellerRow) => r.currentStock ?? "-" },
      ],
      bestSellers
    );
    toast.success("Successfully exported best-selling products to CSV.");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            In-depth analysis of sales and product performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleExportSalesCsv}>
            <Download className="mr-2 h-4 w-4" />
            Sales Trends CSV
          </Button>
          <Button variant="outline" onClick={handleExportBestSellersCsv}>
            <Download className="mr-2 h-4 w-4" />
            Best Sellers CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:items-end md:gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="groupBy">Group Chart By</Label>
          <Select value={groupBy} onValueChange={(value) => setGroupBy(value as GroupBy)}>
            <SelectTrigger id="groupBy">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">By Day</SelectItem>
              <SelectItem value="month">By Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleApplyFilter} className="md:w-auto">
          Apply Filter
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Revenue"
          value={summary ? formatCurrency(Number(summary.netRevenue)) : formatCurrency(0)}
          description={summary ? `Gross ${formatCurrency(Number(summary.grossRevenue))}` : undefined}
          icon={DollarSign}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Refunds"
          value={summary ? formatCurrency(Number(summary.totalRefunds)) : formatCurrency(0)}
          description="Value of refunded transactions"
          icon={TrendingDown}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Transactions"
          value={summary ? String(summary.totalTransactions) : "0"}
          description={
            summary ? `Average ${formatCurrency(Number(summary.averageTransactionValue))}` : undefined
          }
          icon={Receipt}
          isLoading={isLoadingSummary}
        />
        <StatCard
          title="Total Customers"
          value={summary ? String(summary.totalCustomers) : "0"}
          description="Registered customers"
          icon={Users}
          isLoading={isLoadingSummary}
        />
      </div>

      <SalesChart
        data={salesData}
        isLoading={isLoadingSales}
        groupBy={groupBy}
        title="Sales Trends"
        description={`Range ${appliedStart} to ${appliedEnd}, grouped by ${
          groupBy === "day" ? "day" : "month"
        }`}
      />

      <BestSellersTable
        data={bestSellers}
        isLoading={isLoadingBestSellers}
        title="Best Selling Products"
        description="Top 20 products based on units sold in the selected range"
      />
    </div>
  );
}
