"use client";

import type { UserRole } from "@prisma/client";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Hook sederhana untuk memeriksa apakah user yang sedang login memiliki
 * salah satu role yang diizinkan. Dipakai di halaman-halaman yang hanya
 * boleh diakses OWNER/ADMIN (Dashboard, Produk, Kategori, Laporan, AI
 * Assistant) atau OWNER saja (Manajemen Staff, Pengaturan).
 *
 * Ini adalah proteksi UI (lapisan kedua). Middleware hanya memvalidasi sesi
 * login, BUKAN role - jadi setiap halaman route-group `(dashboard)` yang
 * sensitif WAJIB memanggil hook ini, dan setiap API route terkait WAJIB
 * tetap memanggil `requireRole()` di server sebagai lapisan pertahanan utama.
 */
export function useRoleGuard(allowedRoles: UserRole[]): boolean {
  return useAuthStore((s) => !!s.profile && allowedRoles.includes(s.profile.role));
}
