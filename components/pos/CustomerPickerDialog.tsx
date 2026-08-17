"use client";

import { useEffect, useState } from "react";
import { Search as SearchIcon, UserX as UserXIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/useDebounce";
import { useCartStore } from "@/store/useCartStore";

interface ApiCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface CustomerPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerPickerDialog({ open, onOpenChange }: CustomerPickerDialogProps): React.JSX.Element {
  const setCustomer = useCartStore((s) => s.setCustomer);

  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    if (!open) return;

    let isCancelled = false;
    setIsLoading(true);

    const params = new URLSearchParams({ limit: "20" });
    if (debouncedSearch) params.set("search", debouncedSearch);

    fetch(`/api/customers?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (isCancelled) return;
        if (json?.success) {
          setCustomers(json.data);
        } else {
          toast.error(json?.message ?? "Failed to load customer list.");
        }
      })
      .catch(() => {
        if (!isCancelled) toast.error("Failed to load customer list.");
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [open, debouncedSearch]);

  function handleSelect(customer: ApiCustomer) {
    setCustomer({ id: customer.id, name: customer.name, phone: customer.phone });
    onOpenChange(false);
  }

  function handleNoCustomer() {
    setCustomer(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>Search customer by name, phone, or email.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search......"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant="outline" className="w-full justify-start gap-2" onClick={handleNoCustomer}>
          <UserXIcon className="h-4 w-4" />
          No Customer
        </Button>

        <div className="max-h-80 space-y-2 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)
          ) : customers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No customer found.</p>
          ) : (
            customers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => handleSelect(customer)}
                className="flex w-full flex-col rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="font-medium">{customer.name}</span>
                <span className="text-xs text-muted-foreground">{customer.phone || customer.email || "-"}</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
