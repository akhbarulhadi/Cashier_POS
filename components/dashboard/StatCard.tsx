import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: LucideIcon;
  isLoading?: boolean;
  badge?: {
    label: string;
    variant?: BadgeProps["variant"];
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  isLoading,
  badge,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card className={cn(className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          {Icon ? <Skeleton className="h-8 w-8 rounded-full" /> : null}
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="mt-2 h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="mt-1 flex items-center gap-2">
          {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          {badge ? (
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.label}
            </Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
