"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PackageIcon, SearchIcon, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { useCartStore } from "@/store/useCartStore";
import { useUiStore } from "@/store/useUiStore";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useCallback } from "react";

interface ApiCategory {
  id: string;
  name: string;
}

interface ApiProduct {
  // touch: force LSP re-resolution
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  costPrice: string;
  sellPrice: string;
  unit: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  imageUrl: string | null;
  category: { id: string; name: string };
}

export function ProductGrid(): React.JSX.Element {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  const searchQuery = useUiStore((s) => s.posSearchQuery);
  const setSearchQuery = useUiStore((s) => s.setPosSearchQuery);
  const selectedCategoryId = useUiStore((s) => s.posSelectedCategoryId);
  const setSelectedCategoryId = useUiStore((s) => s.setPosSelectedCategoryId);

  const addItem = useCartStore((s) => s.addItem);

  const debouncedSearch = useDebounce(searchQuery, 350);

  // Load category list only once
  useEffect(() => {
    fetch("/api/categories?limit=100")
      .then((res) => res.json())
      .then((json) => {
        if (json?.success) setCategories(json.data);
      })
      .catch(() => {
        // Silent fail - category filter is not a critical feature if it fails to load
      });
  }, []);

  // Load products every time search/category changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({
      isActive: "true",
      limit: "50",
      page: "1",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (selectedCategoryId) params.set("categoryId", selectedCategoryId);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isCancelled) return;
        if (json?.success) {
          setProducts(json.data);
        } else {
          toast.error(json?.message ?? "Failed to load product list.");
        }
      })
      .catch(() => {
        if (!isCancelled) toast.error("Failed to load product list.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, selectedCategoryId]);

  const handleAddToCart = useCallback((product: ApiProduct) => {
    if (product.stock <= 0) {
      toast.error(`Stock for "${product.name}" is empty.`);
      return;
    }

    addItem(
      {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        imageUrl: product.imageUrl,
        unit: product.unit,
        sellPrice: Number(product.sellPrice),
        costPrice: Number(product.costPrice),
        availableStock: product.stock,
      },
      1
    );
    toast.success(`"${product.name}" added to cart.`);
  }, [addItem]);

  const handleScan = useCallback(async (barcode: string) => {
    // 1. Check if the product is already on the currently loaded page
    let match = products.find(p => p.barcode === barcode || p.sku === barcode);
    
    // 2. If not found, fetch from API (useful if the product is on another page or filter is active)
    if (!match) {
      try {
        const res = await fetch(`/api/products?search=${barcode}&limit=5`);
        const json = await res.json();
        if (json?.success && json.data.length > 0) {
          // Only look for exact matches with barcode or SKU
          match = json.data.find((p: ApiProduct) => p.barcode === barcode || p.sku === barcode);
        }
      } catch (err) {
        console.error("Failed to search product by barcode:", err);
      }
    }

    if (match) {
      handleAddToCart(match);
    } else {
      toast.error(`Product with barcode ${barcode} not found.`);
    }
  }, [products, handleAddToCart]);

  useBarcodeScanner({ onScan: handleScan });

  const handleManualScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    
    await handleScan(manualBarcode.trim());
    setManualBarcode("");
    // Don't close modal to allow multiple scans
  };

  return (
    <>
      <div className="flex h-full flex-col gap-4" data-testid="product-grid">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search......"
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={() => setIsScanModalOpen(true)}
            className="gap-2 sm:w-auto w-full"
          >
            <ScanLine className="h-4 w-4" />
            Scan Barcode
          </Button>
          <Select
          value={selectedCategoryId ?? "all"}
          onValueChange={(value) => setSelectedCategoryId(value === "all" ? null : value)}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No products found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {products.map((product) => {
              const isOutOfStock = product.stock <= 0;
              const isLowStock = !isOutOfStock && product.stock <= product.minStock;

              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => handleAddToCart(product)}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-all hover:shadow-md",
                    isOutOfStock
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-primary/50 active:scale-[0.98]"
                  )}
                >
                  <div className="relative flex h-24 w-full items-center justify-center bg-muted">
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                    ) : (
                      <PackageIcon className="h-8 w-8 text-muted-foreground" />
                    )}
                    <Badge
                      variant={isOutOfStock ? "destructive" : isLowStock ? "warning" : "secondary"}
                      className="absolute right-1 top-1"
                    >
                      {isOutOfStock ? "Out of Stock" : `Stock ${product.stock}`}
                    </Badge>
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 p-2.5">
                    <p className="line-clamp-2 text-sm font-medium leading-tight">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                    <p className="mt-auto text-sm font-semibold text-primary">
                      {formatCurrency(product.sellPrice)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>

    <Dialog open={isScanModalOpen} onOpenChange={setIsScanModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Barcode</DialogTitle>
          <DialogDescription>
            Scan your product barcode or type the code manually.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleManualScanSubmit} className="flex flex-col gap-4">
          <Input
            id="manual-barcode"
            placeholder="Type/scan barcode here..."
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            autoFocus
            autoComplete="off"
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsScanModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!manualBarcode.trim()}>
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </>
  );
}
