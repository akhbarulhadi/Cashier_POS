"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Search } from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/export-csv";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface TransactionRow {
  id: string;
  invoiceNumber: string;
  customerId: string | null;
  cashierId: string;
  grandTotal: string;
  paymentMethod: string;
  status: string;
  createdAt: string;
  cashier: { id: string; fullName: string };
  customer: { id: string; name: string } | null;
  _count: { items: number };
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusVariant: Record<string, BadgeProps["variant"]> = {
  COMPLETED: "success",
  PENDING: "warning",
  REFUNDED: "secondary",
  PARTIALLY_REFUNDED: "secondary",
  CANCELLED: "destructive",
};

const statusOptions = [
  { value: "PENDING", label: "Pending" },
  { value: "COMPLETED", label: "Completed" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "PARTIALLY_REFUNDED", label: "Partially Refunded" },
  { value: "CANCELLED", label: "Cancelled" },
];

const paymentOptions = [
  { value: "CASH", label: "Cash" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "QRIS", label: "QRIS" },
  { value: "E_WALLET", label: "E-Wallet" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

const ALL = "ALL";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [status, setStatus] = useState<string>(ALL);
  const [paymentMethod, setPaymentMethod] = useState<string>(ALL);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== ALL) params.set("status", status);
      if (paymentMethod !== ALL) params.set("paymentMethod", paymentMethod);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load transaction history.");
      }
      setTransactions(json.data);
      setMeta(json.meta ?? null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, status, paymentMethod, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, paymentMethod, startDate, endDate]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ page: "1", limit: "1000" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== ALL) params.set("status", status);
      if (paymentMethod !== ALL) params.set("paymentMethod", paymentMethod);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch data for export.");
      }

      const rows: TransactionRow[] = json.data;
      if (rows.length === 0) {
        toast.info("No data to export for the current filters.");
        return;
      }

      exportToCsv(
        `transaction-history-${new Date().toISOString().slice(0, 10)}`,
        [
          { header: "Invoice No.", accessor: (r: TransactionRow) => r.invoiceNumber },
          { header: "Date", accessor: (r: TransactionRow) => formatDate(r.createdAt) },
          { header: "Kasir", accessor: (r: TransactionRow) => r.cashier?.fullName ?? "-" },
          { header: "Customer", accessor: (r: TransactionRow) => r.customer?.name ?? "-" },
          { header: "Total Items", accessor: (r: TransactionRow) => r._count.items },
          { header: "Payment Method", accessor: (r: TransactionRow) => r.paymentMethod },
          { header: "Status", accessor: (r: TransactionRow) => r.status },
          { header: "Total (Rp)", accessor: (r: TransactionRow) => Number(r.grandTotal) },
        ],
        rows
      );

      toast.success(`Successfully exported ${rows.length} transactions to CSV.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to export data.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-sm text-muted-foreground">
            Monitor all sales transactions of your store.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExportCsv}
          disabled={isExporting}
          className="self-start md:self-auto"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Filter</CardTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search......"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Statuses</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Methods</SelectItem>
                {paymentOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || undefined}
            />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || undefined}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No transactions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.invoiceNumber}</TableCell>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>{tx.cashier?.fullName ?? "-"}</TableCell>
                      <TableCell>{tx.customer?.name ?? "-"}</TableCell>
                      <TableCell>{formatCurrency(tx.grandTotal)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[tx.status] ?? "default"}>{tx.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/transactions/${tx.id}`}>Detail</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages} ({meta.total} transactions)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
