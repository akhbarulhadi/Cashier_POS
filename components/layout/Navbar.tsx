"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu, User as UserIcon, Store } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useAuthStore } from "@/store/useAuthStore";
import { useUiStore } from "@/store/useUiStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Badge } from "@/components/ui/badge";

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Store Owner",
  ADMIN: "Admin",
  CASHIER: "Cashier",
};

export function Navbar() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const toggleMobileSidebar = useUiStore((s) => s.toggleMobileSidebar);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Successfully logged out");
    router.push("/login");
    router.refresh();
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <header className="no-print flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6">
      <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileSidebar}>
        <Menu className="h-5 w-5" />
      </Button>

      {/* Store name indicator (desktop) */}
      {profile?.storeName && (
        <div className="hidden items-center gap-1.5 text-sm text-muted-foreground md:flex">
          <Store className="h-3.5 w-3.5" />
          <span className="font-medium">{profile.storeName}</span>
        </div>
      )}

      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left md:block">
                <p className="text-sm font-medium leading-none">{profile?.fullName ?? "User"}</p>
                <p className="text-xs text-muted-foreground">
                  {profile ? ROLE_LABEL[profile.role] : "-"}
                </p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{profile?.fullName}</span>
                <span className="text-xs font-normal text-muted-foreground">{profile?.email}</span>
                {profile && (
                  <Badge variant="secondary" className="mt-1 w-fit">
                    {ROLE_LABEL[profile.role]}
                  </Badge>
                )}
                {profile?.storeName && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Store className="h-3 w-3" />
                    {profile.storeName}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <UserIcon className="mr-2 h-4 w-4" />
              Profile &amp; Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
