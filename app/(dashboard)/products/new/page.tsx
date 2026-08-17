"use client";

import { ProductForm } from "@/components/products/ProductForm";

export default function NewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Add Product</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi informasi produk baru di bawah ini.
        </p>
      </div>

      <ProductForm mode="create" />
    </div>
  );
}
