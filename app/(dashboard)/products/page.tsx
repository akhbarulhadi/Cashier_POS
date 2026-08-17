"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ProductTable, type ProductRow } from "@/components/products/ProductTable";
import { useDebounce } from "@/hooks/useDebounce";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDenied } from "@/components/layout/AccessDenied";

interface Category {
  id: string;
  name: string;
}

const LIMIT = 20;

export default function ProductsPage() {
  const isAllowed = useRoleGuard(["OWNER", "ADMIN"]);

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    if (!isAllowed) return;
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/categories?limit=100");
        const json = await res.json();
        if (res.ok && json.success) setCategories(json.data);
      } catch {
        // Failure to load filter categories is not critical, allow users to still see products.
      }
    };
    fetchCategories();
  }, [isAllowed]);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (categoryId !== "all") params.set("categoryId", categoryId);
      if (activeFilter !== "all") params.set("isActive", activeFilter === "active" ? "true" : "false");
      if (lowStockOnly) params.set("lowStockOnly", "true");

      const res = await fetch(`/api/products?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Failed to load products.");
      }

      setProducts(json.data);
      setMeta({
        total: json.meta?.total ?? 0,
        totalPages: json.meta?.totalPages ?? 1,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch, categoryId, activeFilter, lowStockOnly]);

  useEffect(() => {
    if (isAllowed) fetchProducts();
  }, [fetchProducts, isAllowed]);

  // Reset to page 1 whenever filters change to avoid showing an empty page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, activeFilter, lowStockOnly]);

  if (!isAllowed) {
    return <AccessDenied message="Product management can only be accessed by Store Owners and Admins." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Product Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage your store's product list, prices, and stock.
          </p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search......"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-48">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-40">
            <Select value={activeFilter} onValueChange={setActiveFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="lowStockOnly"
              checked={lowStockOnly}
              onCheckedChange={setLowStockOnly}
            />
            <Label htmlFor="lowStockOnly" className="whitespace-nowrap">
              Low Stock Only
            </Label>
          </div>
        </CardContent>
      </Card>

      <ProductTable products={products} isLoading={isLoading} onChanged={fetchProducts} />

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Total {meta.total} products</p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span>
            Page {page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
