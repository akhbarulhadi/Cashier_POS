"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Pencil, PackagePlus, Trash2, ImageOff } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StockAdjustmentDialog } from "@/components/products/StockAdjustmentDialog";
import { DeleteConfirmDialog } from "@/components/products/DeleteConfirmDialog";
import { formatCurrency } from "@/lib/utils";

export interface ProductRow {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  categoryId: string;
  imageUrl?: string | null;
  sellPrice: string | number;
  stock: number;
  minStock: number;
  isActive: boolean;
  category?: { id: string; name: string } | null;
}

interface ProductTableProps {
  products: ProductRow[];
  isLoading: boolean;
  onChanged: () => void;
}

export function ProductTable({ products, isLoading, onChanged }: ProductTableProps) {
  const [stockDialogProduct, setStockDialogProduct] = useState<ProductRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const stockBadgeVariant = (stock: number, minStock: number) => {
    if (stock <= 0) return "destructive" as const;
    if (stock <= minStock) return "warning" as const;
    return "secondary" as const;
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Failed to delete product.");
      }

      toast.success(json.message ?? "Product successfully deleted.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
        No products found.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium leading-none">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{product.category?.name ?? "-"}</Badge>
                </TableCell>
                <TableCell>{formatCurrency(product.sellPrice)}</TableCell>
                <TableCell>
                  <Badge variant={stockBadgeVariant(product.stock, product.minStock)}>
                    {product.stock} {product.stock <= product.minStock ? "· Low" : ""}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={product.isActive ? "success" : "secondary"}>
                    {product.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/products/${product.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStockDialogProduct(product)}>
                        <PackagePlus className="h-4 w-4" />
                        Adjust Stock
                      </DropdownMenuItem>
                      <DeleteConfirmDialog
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        }
                        title="Delete Product"
                        description={`Are you sure you want to delete the product "${product.name}"? This action can be undone by system admins.`}
                        isLoading={deletingId === product.id}
                        onConfirm={() => handleDelete(product.id)}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {stockDialogProduct && (
        <StockAdjustmentDialog
          open={!!stockDialogProduct}
          onOpenChange={(open) => {
            if (!open) setStockDialogProduct(null);
          }}
          productId={stockDialogProduct.id}
          productName={stockDialogProduct.name}
          currentStock={stockDialogProduct.stock}
          onSuccess={onChanged}
        />
      )}
    </>
  );
}
