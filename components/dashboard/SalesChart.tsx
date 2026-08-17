"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface SalesChartPoint {
  period: string;
  totalRevenue: number;
  totalTransactions: number;
}

interface SalesChartProps {
  data: SalesChartPoint[];
  isLoading?: boolean;
  title?: string;
  description?: string;
  groupBy?: "day" | "month";
}

function CustomTooltip({
  active,
  payload,
  label,
  groupBy,
}: {
  active?: boolean;
  payload?: { value: number; name: string; dataKey: string }[];
  label?: string;
  groupBy?: "day" | "month";
}) {
  if (!active || !payload || payload.length === 0 || !label) return null;

  const revenue = payload.find((p) => p.dataKey === "totalRevenue")?.value ?? 0;
  const transactions = payload.find((p) => p.dataKey === "totalTransactions")?.value ?? 0;

  return (
    <div className="rounded-lg border bg-popover p-3 text-sm shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">
        {formatDate(label, false)}
      </p>
      <p className="text-muted-foreground">
        Revenue: <span className="font-semibold text-foreground">{formatCurrency(revenue)}</span>
      </p>
      <p className="text-muted-foreground">
        Transactions: <span className="font-semibold text-foreground">{transactions}</span>
      </p>
    </div>
  );
}

export function SalesChart({ data, isLoading, title = "Sales Trend", description, groupBy = "day" }: SalesChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.period, false),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
            No sales data for this range.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value: string) => formatDate(value, false)}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={groupBy === "day" ? 24 : 8}
                />
                <YAxis
                  tickFormatter={(value: number) => formatCurrency(value, { withSymbol: false })}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip content={<CustomTooltip groupBy={groupBy} />} />
                <Area
                  type="monotone"
                  dataKey="totalRevenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#salesRevenue)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
