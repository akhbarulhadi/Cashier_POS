import { PackageX } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  unit: string;
  category?: { id: string; name: string } | null;
}

interface LowStockWidgetProps {
  products: LowStockProduct[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  limit?: number;
}

export function LowStockWidget({
  products,
  isLoading,
  title = "Low Stock",
  description = "Products that need immediate restock",
  limit,
}: LowStockWidgetProps) {
  const items = limit ? products.slice(0, limit) : products;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <PackageX className="h-8 w-8 opacity-50" />
            <p>All product stocks are safe.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((product) => {
              const isEmpty = product.stock === 0;
              return (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {product.sku}
                      {product.category ? ` · ${product.category.name}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant={isEmpty ? "destructive" : "warning"}>
                      {product.stock} {product.unit}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">min. {product.minStock}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
