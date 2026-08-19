"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { UserRole } from "@prisma/client";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Users,
  History,
  UserCog,
  BarChart3,
  Bot,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/store/useUiStore";
import { Button } from "@/components/ui/button";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: UserRole[]; // if undefined, all roles have access
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["OWNER", "ADMIN"] },
  { href: "/pos", label: "Cashier (POS)", icon: ShoppingCart },
  { href: "/products", label: "Product", icon: Package, roles: ["OWNER", "ADMIN"] },
  { href: "/categories", label: "Category", icon: Tags, roles: ["OWNER", "ADMIN"] },
  { href: "/customers", label: "Customer", icon: Users },
  { href: "/transactions", label: "Transaction History", icon: History },
  { href: "/reports", label: "Report", icon: BarChart3, roles: ["OWNER", "ADMIN"] },
  { href: "/ai-assistant", label: "AI Assistant", icon: Bot, roles: ["OWNER", "ADMIN"] },
  { href: "/users", label: "Staff Management", icon: UserCog, roles: ["OWNER"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["OWNER"] },
];

export function Sidebar({ role, storeName }: { role: UserRole; storeName: string }) {
  const pathname = usePathname();
  const isCollapsed = useUiStore((s) => s.isSidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const isMobileOpen = useUiStore((s) => s.isMobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);

  const visibleItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));

  const handleItemClick = () => {
    if (isMobileOpen) {
      setMobileOpen(false);
    }
  };

  const SidebarContent = (
    <>
      <div className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        {(!isCollapsed || isMobileOpen) && (
          <div className="flex min-w-0 items-center gap-2 font-semibold">
            <Store className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate text-sm" title={storeName}>
              {storeName}
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(isCollapsed && !isMobileOpen && "mx-auto")}
          onClick={() => (isMobileOpen ? setMobileOpen(false) : toggleSidebar())}
        >
          {isMobileOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={handleItemClick}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              title={isCollapsed && !isMobileOpen ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-3/4 max-w-sm flex-col border-r bg-card shadow-lg transition-transform duration-300 md:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {SidebarContent}
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "no-print hidden shrink-0 flex-col border-r bg-card transition-all duration-200 md:flex",
          isCollapsed ? "w-[68px]" : "w-64"
        )}
      >
        {SidebarContent}
      </aside>
    </>
  );
}
