"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
} from "@/lib/validations/product.schema";

interface Category {
  id: string;
  name: string;
}

export interface ProductFormInitialData {
  id: string;
  sku: string;
  barcode?: string | null;
  name: string;
  categoryId: string;
  description?: string | null;
  imageUrl?: string | null;
  costPrice: string | number;
  sellPrice: string | number;
  unit: string;
  stock: number;
  minStock: number;
  isActive: boolean;
}

interface ProductFormProps {
  mode: "create" | "edit";
  productId?: string;
  initialData?: ProductFormInitialData;
}

type ProductFormValues = CreateProductInput;

export function ProductForm({ mode, productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(
      mode === "create" ? createProductSchema : updateProductSchema
    ) as Resolver<ProductFormValues>,
    defaultValues: {
      sku: initialData?.sku ?? "",
      barcode: initialData?.barcode ?? "",
      name: initialData?.name ?? "",
      categoryId: initialData?.categoryId ?? "",
      description: initialData?.description ?? "",
      imageUrl: initialData?.imageUrl ?? "",
      costPrice: initialData ? Number(initialData.costPrice) : 0,
      sellPrice: initialData ? Number(initialData.sellPrice) : 0,
      unit: initialData?.unit ?? "pcs",
      stock: initialData?.stock ?? 0,
      minStock: initialData?.minStock ?? 5,
      isActive: initialData?.isActive ?? true,
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const res = await fetch("/api/categories?limit=100");
        const json = await res.json();
        if (res.ok && json.success) {
          setCategories(json.data);
        }
      } catch {
        toast.error("Failed to load category list.");
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const onSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...values,
        barcode: values.barcode || null,
        description: values.description || null,
        imageUrl: values.imageUrl || null,
      };

      if (mode === "create") {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to create product.");
        }

        toast.success(json.message ?? "Product successfully created.");
        router.push("/products");
      } else {
        const { stock, ...updatePayload } = payload;

        const res = await fetch(`/api/products/${productId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Failed to update product.");
        }

        toast.success(json.message ?? "Product successfully updated.");
        router.push("/products");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Product Name</Label>
            <Input id="name" placeholder="Example: Cola" {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" placeholder="Example: SKU-001" {...register("sku")} />
            {errors.sku && <p className="text-sm text-destructive">{errors.sku.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode">Barcode (optional)</Label>
            <Input id="barcode" placeholder="Example: 8991234567890" {...register("barcode")} />
            {errors.barcode && (
              <p className="text-sm text-destructive">{errors.barcode.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="categoryId">Category</Label>
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingCategories}>
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder={isLoadingCategories ? "Loading categories..." : "Select category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea id="description" placeholder="Product description" {...register("description")} />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="imageUrl">Image URL (optional)</Label>
            <Input id="imageUrl" placeholder="https://..." {...register("imageUrl")} />
            {errors.imageUrl && (
              <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Price & Stock</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="costPrice">Cost Price (COGS)</Label>
            <Input
              id="costPrice"
              type="number"
              min={0}
              step="0.01"
              {...register("costPrice")}
            />
            {errors.costPrice && (
              <p className="text-sm text-destructive">{errors.costPrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sellPrice">Selling Price</Label>
            <Input
              id="sellPrice"
              type="number"
              min={0}
              step="0.01"
              {...register("sellPrice")}
            />
            {errors.sellPrice && (
              <p className="text-sm text-destructive">{errors.sellPrice.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input id="unit" placeholder="pcs" {...register("unit")} />
            {errors.unit && <p className="text-sm text-destructive">{errors.unit.message}</p>}
          </div>

          {mode === "create" && (
            <div className="space-y-2">
              <Label htmlFor="stock">Initial Stock</Label>
              <Input id="stock" type="number" min={0} step={1} {...register("stock")} />
              {errors.stock && (
                <p className="text-sm text-destructive">{errors.stock.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minStock">Minimum Stock</Label>
            <Input id="minStock" type="number" min={0} step={1} {...register("minStock")} />
            {errors.minStock && (
              <p className="text-sm text-destructive">{errors.minStock.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-input px-3 py-2 sm:col-span-2">
            <div>
              <Label htmlFor="isActive">Active Status</Label>
              <p className="text-sm text-muted-foreground">
                Inactive products will not appear on the cashier page.
              </p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/products")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "create" ? "Save Product" : "Update Product"}
        </Button>
      </div>
    </form>
  );
}
