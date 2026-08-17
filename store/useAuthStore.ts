"use client";

import { create } from "zustand";
import type { UserRole } from "@prisma/client";

/**
 * Zustand Store - Profil Pengguna Aktif (Client-Side Cache)
 * ============================================================================
 * Sumber kebenaran (source of truth) tetap sesi Supabase Auth + tabel
 * `public.users` di server. Store ini HANYA cache ringan di client agar
 * komponen (Sidebar, Navbar, guard tombol berbasis role) tidak perlu
 * fetch berulang ke `/api/users/sync` setiap render.
 * ============================================================================
 */

export interface AuthProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
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
