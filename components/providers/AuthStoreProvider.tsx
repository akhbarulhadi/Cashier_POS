"use client";

import { useEffect } from "react";
import { useAuthStore, type AuthProfile } from "@/store/useAuthStore";

/**
 * Menghidrasi `useAuthStore` (Zustand) dengan profil user yang sudah diambil
 * di server (Server Component layout). Dengan begini komponen client
 * (Sidebar, Navbar, guard tombol per-role) langsung punya data tanpa fetch ulang.
 */
export function AuthStoreProvider({
  profile,
  children,
}: {
  profile: AuthProfile;
  children: React.ReactNode;
}) {
  const setProfile = useAuthStore((s) => s.setProfile);

  useEffect(() => {
    setProfile(profile);
  }, [profile, setProfile]);

  return <>{children}</>;
}
