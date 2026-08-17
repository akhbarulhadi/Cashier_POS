"use client";

import type { UserRole } from "@prisma/client";
import { useAuthStore } from "@/store/useAuthStore";

export function useRoleGuard(allowedRoles: UserRole[]): boolean {
  return useAuthStore((s) => !!s.profile && allowedRoles.includes(s.profile.role));
}
