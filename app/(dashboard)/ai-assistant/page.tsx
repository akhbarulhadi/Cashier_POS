"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChatWidget } from "@/components/ai/ChatWidget";
import { Check, Loader2, PackagePlus, CheckCheck } from "lucide-react";

interface Recommendation {
  productId: string;
  productName: string;
  currentStock: number;
  minStock: number;
  suggestedRestockQty: number;
  urgency: "HIGH" | "MEDIUM" | "LOW";
  reasoning: string;
}

interface RestockData {
  recommendations: Recommendation[];
  summary: string;
  aiGenerated: boolean;
  warning?: string;
}

const urgencyVariant: Record<string, BadgeProps["variant"]> = {
  HIGH: "destructive",
  MEDIUM: "warning",
  LOW: "secondary",
};

const urgencyLabel: Record<string, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

function RestockRecommendation(): React.JSX.Element {
  const [data, setData] = useState<RestockData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingIds, setApplyingIds] = useState<Set<string>>(new Set());
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  const fetchRecommendation = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/ai/restock-recommendation?days=30");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load restock recommendations.");
      }
      setData(json.data);
      // Reset applied state on fresh fetch
      setAppliedIds(new Set());
      setApplyingIds(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendation();
  }, [fetchRecommendation]);

  const applyRestock = async (rec: Recommendation) => {
    if (appliedIds.has(rec.productId) || applyingIds.has(rec.productId)) return;

    setApplyingIds((prev) => new Set(prev).add(rec.productId));

    try {
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: rec.productId,
          type: "PURCHASE_IN",
          quantity: rec.suggestedRestockQty,
          note: `Auto-restock from AI recommendation - ${rec.productName} (+${rec.suggestedRestockQty} units)`,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to apply restock.");
      }

      setAppliedIds((prev) => new Set(prev).add(rec.productId));
      toast.success(`Successfully restocked ${rec.productName} (+${rec.suggestedRestockQty} units)`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : `Failed to restock ${rec.productName}.`
      );
    } finally {
      setApplyingIds((prev) => {
        const next = new Set(prev);
        next.delete(rec.productId);
        return next;
      });
    }
  };

  const applyAll = async () => {
    if (!data || data.recommendations.length === 0) return;

    const pending = data.recommendations.filter(
      (rec) => !appliedIds.has(rec.productId)
    );

    if (pending.length === 0) {
      toast.info("All recommendations have been applied.");
      return;
    }

    setIsApplyingAll(true);
    let successCount = 0;
    let failCount = 0;

    for (const rec of pending) {
      try {
        setApplyingIds((prev) => new Set(prev).add(rec.productId));

        const res = await fetch("/api/stock-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: rec.productId,
            type: "PURCHASE_IN",
            quantity: rec.suggestedRestockQty,
            note: `Auto-restock from AI recommendation - ${rec.productName} (+${rec.suggestedRestockQty} units)`,
          }),
        });
        const json = await res.json();

        if (res.ok && json.success) {
          setAppliedIds((prev) => new Set(prev).add(rec.productId));
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      } finally {
        setApplyingIds((prev) => {
          const next = new Set(prev);
          next.delete(rec.productId);
          return next;
        });
      }
    }

    setIsApplyingAll(false);

    if (failCount === 0) {
      toast.success(`Successfully applied all ${successCount} restock recommendations.`);
    } else {
      toast.warning(
        `${successCount} applied, ${failCount} failed. Please try again for the failed ones.`
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">No recommendation data available yet.</p>;
  }

  const pendingCount = data.recommendations.filter(
    (r) => !appliedIds.has(r.productId)
  ).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Summary</CardTitle>
              <CardDescription>{data.summary}</CardDescription>
            </div>
            {data.recommendations.length > 0 && (
              <Button
                onClick={applyAll}
                disabled={isApplyingAll || pendingCount === 0}
                className="gap-1.5"
                size="sm"
              >
                {isApplyingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : pendingCount === 0 ? (
                  <CheckCheck className="h-4 w-4" />
                ) : (
                  <PackagePlus className="h-4 w-4" />
                )}
                {pendingCount === 0
                  ? "All Applied"
                  : `Apply All (${pendingCount})`}
              </Button>
            )}
          </div>
        </CardHeader>
        {!data.aiGenerated && (
          <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
              Note: these recommendations are rule-based (not generative AI) because
              the AI API key is not configured{data.warning ? ` - ${data.warning}` : "."}
            </p>
          </CardContent>
        )}
      </Card>

      {data.recommendations.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No products require restocking at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.recommendations.map((rec) => {
            const isApplied = appliedIds.has(rec.productId);
            const isApplying = applyingIds.has(rec.productId);

            return (
              <Card
                key={rec.productId}
                className={isApplied ? "border-green-500/30 bg-green-50/50 dark:bg-green-950/10" : ""}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{rec.productName}</p>
                        {isApplied && (
                          <Badge variant="default" className="bg-green-600 gap-1 text-[10px]">
                            <Check className="h-3 w-3" />
                            Applied
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Current stock: {rec.currentStock} | Min stock: {rec.minStock} |
                        Suggested restock:{" "}
                        <span className="font-semibold text-foreground">
                          +{rec.suggestedRestockQty} units
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={urgencyVariant[rec.urgency] ?? "default"}>
                        Urgency: {urgencyLabel[rec.urgency] ?? rec.urgency}
                      </Badge>
                      <Button
                        size="sm"
                        variant={isApplied ? "outline" : "default"}
                        disabled={isApplied || isApplying}
                        onClick={() => applyRestock(rec)}
                        className="gap-1.5 text-xs h-8"
                      >
                        {isApplying ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isApplied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <PackagePlus className="h-3.5 w-3.5" />
                        )}
                        {isApplied ? "Restocked" : "Apply Restock"}
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{rec.reasoning}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AiAssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Get AI-powered business advice and restock recommendations.
        </p>
      </div>

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat Advisor</TabsTrigger>
          <TabsTrigger value="restock">Restock Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="chat">
          <ChatWidget />
        </TabsContent>

        <TabsContent value="restock">
          <RestockRecommendation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
