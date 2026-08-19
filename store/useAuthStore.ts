"use client";

import { create } from "zustand";
import type { UserRole } from "@prisma/client";

/** Zustand Store - Profil Pengguna Aktif (Client-Side Cache) */

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  storeId?: string | null;
  storeName?: string | null;
}

interface AuthState {
  profile: AuthProfile | null;
  isLoading: boolean;
  setProfile: (profile: AuthProfile | null) => void;
  setLoading: (value: boolean) => void;
  clearProfile: () => void;

  /** Helper role-check yang dipakai untuk menyembunyikan/menonaktifkan UI. */
  hasRole: (...roles: UserRole[]) => boolean;
  isOwner: () => boolean;
  isManagerial: () => boolean;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  profile: null,
  isLoading: true,

  setProfile: (profile) => set({ profile, isLoading: false }),
  setLoading: (value) => set({ isLoading: value }),
  clearProfile: () => set({ profile: null, isLoading: false }),

  hasRole: (...roles) => {
    const profile = get().profile;
    return !!profile && roles.includes(profile.role);
  },
  isOwner: () => get().hasRole("OWNER" as UserRole),
  isManagerial: () => get().hasRole("OWNER" as UserRole, "ADMIN" as UserRole),
}));
