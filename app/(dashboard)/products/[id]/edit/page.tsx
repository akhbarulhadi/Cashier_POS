"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductForm, type ProductFormInitialData } from "@/components/products/ProductForm";

interface EditProductPageProps {
  params: { id: string };
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const { id } = params;

  const [product, setProduct] = useState<ProductFormInitialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/products/${id}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message ?? "Gagal memuat data produk.");
        }

        setProduct(json.data);
      } catch (err) {
        setNotFound(true);
        toast.error(err instanceof Error ? err.message : "Terjadi kesalahan.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit Produk</h1>
        <p className="text-sm text-muted-foreground">
          Perbarui informasi produk di bawah ini.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      ) : notFound || !product ? (
        <div className="flex h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
          Produk tidak ditemukan.
        </div>
      ) : (
        <ProductForm mode="edit" productId={id} initialData={product} />
      )}
    </div>
  );
}
