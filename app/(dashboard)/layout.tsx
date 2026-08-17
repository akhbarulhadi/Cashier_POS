import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { AuthStoreProvider } from "@/components/providers/AuthStoreProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let profile;
  try {
    profile = await getAuthenticatedUser();
  } catch {
    redirect("/login");
  }

  return (
    <AuthStoreProvider
      profile={{
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
        avatarUrl: profile.avatarUrl,
        isActive: profile.isActive,
      }}
    >
      <div className="flex h-screen overflow-hidden bg-muted/20">
        <Sidebar role={profile.role} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Navbar />
          <div className="flex flex-1 flex-col overflow-y-auto">
            <main className="flex-1 p-4 md:p-6">{children}</main>
            <Footer />
          </div>
        </div>
      </div>
    </AuthStoreProvider>
  );
}
