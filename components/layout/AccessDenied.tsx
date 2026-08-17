import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Displayed as a fallback for page content when the currently logged-in user 
 * is not allowed to access the page. This is the second layer of defense on 
 * the client side (first layer: menu items hidden in Sidebar; third layer: 
 * every API route still validates roles on the server via `requireRole()` 
 * regardless of UI actions).
 */
export function AccessDenied({
  message = "You do not have permission to view this page.",
}: {
  message?: string;
}) {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="text-sm text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}
