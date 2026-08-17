"use client";

import { useEffect } from "react";
import { useAuthStore, type AuthProfile } from "@/store/useAuthStore";

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
