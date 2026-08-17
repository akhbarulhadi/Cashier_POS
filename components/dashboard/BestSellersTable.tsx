import { Trophy } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

export interface BestSellerRow {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  totalRevenue: string | number;
  currentStock?: number | null;
  minStock?: number | null;
  imageUrl?: string | null;
}

interface BestSellersTableProps {
  data: BestSellerRow[];
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function BestSellersTable({
  data,
  isLoading,
  title = "Best Selling Products",
  description = "Based on units sold",
}: BestSellersTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-52" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
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
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <Trophy className="h-8 w-8 opacity-50" />
            <p>No sales data in this range.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Stok</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, index) => {
                const isLowStock =
                  row.currentStock != null && row.minStock != null && row.currentStock <= row.minStock;
                return (
                  <TableRow key={row.productId}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell>
                      <p className="font-medium">{row.productName}</p>
                      <p className="text-xs text-muted-foreground">{row.sku}</p>
                    </TableCell>
                    <TableCell className="text-right font-medium">{row.quantitySold}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.totalRevenue)}</TableCell>
                    <TableCell className="text-right">
                      {row.currentStock != null ? (
                        <Badge variant={isLowStock ? "warning" : "secondary"}>{row.currentStock}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
