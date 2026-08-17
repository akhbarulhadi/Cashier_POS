"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryFormDialog, type CategoryData } from "@/components/products/CategoryFormDialog";
import { DeleteConfirmDialog } from "@/components/products/DeleteConfirmDialog";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { AccessDenied } from "@/components/layout/AccessDenied";

interface Category extends CategoryData {
  _count: { products: number };
}

export default function CategoriesPage(): React.JSX.Element {
  const isAllowed = useRoleGuard(["OWNER", "ADMIN"]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<CategoryData | undefined>(undefined);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories?limit=100");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Failed to load categories.");
      }

      setCategories(json.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAllowed) fetchCategories();
  }, [fetchCategories, isAllowed]);

  const openCreateDialog = () => {
    setDialogMode("create");
    setEditingCategory(undefined);
    setDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setDialogMode("edit");
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message ?? "Failed to delete category.");
      }

      toast.success(json.message ?? "Category successfully deleted.");
      fetchCategories();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isAllowed) {
    return <AccessDenied message="Category management can only be accessed by Store Owners and Admins." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Category Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage product categories to organize your store catalog.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
          No categories yet. Add your first category.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{category.name}</CardTitle>
                  <Badge variant="secondary">{category._count.products} products</Badge>
                </div>
                <CardDescription className="line-clamp-2">
                  {category.description || "No description."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                  <Pencil className="h-4 w-4" />
                  Edit
                </Button>
                <DeleteConfirmDialog
                  trigger={
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  }
                  title="Delete Category"
                  description={`Are you sure you want to delete the category "${category.name}"? Categories with active products cannot be deleted.`}
                  isLoading={deletingId === category.id}
                  onConfirm={() => handleDelete(category.id)}
                />
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        initialData={editingCategory}
        onSuccess={fetchCategories}
      />
    </div>
  );
}
