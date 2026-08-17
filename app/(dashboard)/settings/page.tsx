"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/useAuthStore";

const settingsFormSchema = z.object({
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters.").max(150),
  address: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email("Invalid email format.").optional().nullable().or(z.literal("")),
  logoUrl: z.string().trim().url("Invalid logo URL.").optional().nullable().or(z.literal("")),
  receiptFooter: z.string().trim().max(300).optional().nullable(),
  defaultTaxPercent: z.coerce.number().min(0).max(100),
  currency: z.string().trim().max(10),
});

type SettingsFormValues = z.infer<typeof settingsFormSchema>;

export default function SettingsPage() {
  const isOwner = useAuthStore((s) => s.isOwner());
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      storeName: "",
      address: "",
      phone: "",
      email: "",
      logoUrl: "",
      receiptFooter: "",
      defaultTaxPercent: 0,
      currency: "IDR",
    },
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load store settings.");
      }
      reset({
        storeName: json.data.storeName ?? "",
        address: json.data.address ?? "",
        phone: json.data.phone ?? "",
        email: json.data.email ?? "",
        logoUrl: json.data.logoUrl ?? "",
        receiptFooter: json.data.receiptFooter ?? "",
        defaultTaxPercent: Number(json.data.defaultTaxPercent ?? 0),
        currency: json.data.currency ?? "IDR",
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [reset]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const onSubmit = async (values: SettingsFormValues) => {
    if (!isOwner) return;
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          address: values.address || null,
          phone: values.phone || null,
          email: values.email || null,
          logoUrl: values.logoUrl || null,
          receiptFooter: values.receiptFooter || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update store settings.");
      }
      toast.success("Store settings successfully updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure your store's information and preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Store Information</CardTitle>
          <CardDescription>
            {isOwner
              ? "Update the store information that will appear on receipts & reports."
              : "Only the Owner can change these settings."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={!isOwner} className="space-y-4 disabled:opacity-70">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="storeName">Store Name</Label>
                  <Input id="storeName" {...register("storeName")} />
                  {errors.storeName && (
                    <p className="text-xs text-destructive">{errors.storeName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register("phone")} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input id="logoUrl" placeholder="https://..." {...register("logoUrl")} />
                  {errors.logoUrl && (
                    <p className="text-xs text-destructive">{errors.logoUrl.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultTaxPercent">Default Tax (%)</Label>
                  <Input
                    id="defaultTaxPercent"
                    type="number"
                    step="0.01"
                    {...register("defaultTaxPercent")}
                  />
                  {errors.defaultTaxPercent && (
                    <p className="text-xs text-destructive">
                      {errors.defaultTaxPercent.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Input id="currency" {...register("currency")} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" {...register("address")} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Receipt Footer</Label>
                <Textarea
                  id="receiptFooter"
                  placeholder="Example: Thank you for shopping with us!"
                  {...register("receiptFooter")}
                />
              </div>

              {isOwner && (
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
          </fieldset>
        </CardContent>
      </Card>
    </div>
  );
}
