import { UserRole, type User as PrismaUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { createClient } from "@/utils/supabase/server";

/**
 * Mengambil user Supabase Auth yang sedang login, DAN memastikan record
 * profilnya tersinkron di tabel `public.users` (Prisma).
 *
 * Strategi sinkronisasi berlapis:
 *   1. SQL Trigger `on_auth_user_created` (prisma/sql/sync_auth_user_trigger.sql)
 *      seharusnya sudah membuat record ini otomatis saat sign up.
 *   2. Sebagai fallback (mis. trigger belum ter-deploy, atau race condition),
 *      fungsi ini akan melakukan `upsert` manual berdasarkan data auth.users.
 *
 * Dipakai di HAMPIR SEMUA API Route yang membutuhkan identitas pengguna.
 */
export async function getAuthenticatedUser(): Promise<PrismaUser> {
  const supabase = await createClient();

  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    throw ApiError.unauthorized();
  }

  let profile = await prisma.user.findUnique({
    where: { id: authUser.id },
  });

  // Fallback sinkronisasi jika trigger DB belum sempat membuat profil
  if (!profile) {
    const fullName =
      (authUser.user_metadata?.full_name as string | undefined) ||
      (authUser.user_metadata?.name as string | undefined) ||
      authUser.email?.split("@")[0] ||
      "Pengguna Baru";

    profile = await prisma.user.upsert({
      where: { id: authUser.id },
      update: { email: authUser.email ?? undefined },
      create: {
        id: authUser.id,
        email: authUser.email ?? `${authUser.id}@unknown.local`,
        fullName,
        role: UserRole.CASHIER,
      },
    });
  }

  if (!profile.isActive || profile.deletedAt) {
    throw ApiError.forbidden("Akun Anda telah dinonaktifkan. Hubungi admin toko.");
  }

  return profile;
}

/**
 * Memvalidasi apakah user memiliki salah satu role yang diizinkan.
 * Lempar 403 Forbidden jika tidak sesuai.
 */
export function requireRole(user: PrismaUser, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(user.role)) {
    throw ApiError.forbidden(
      `Aksi ini hanya diizinkan untuk role: ${allowedRoles.join(", ")}.`
    );
  }
}

/** Shortcut umum: hanya OWNER & ADMIN yang boleh mengelola data master. */
export const MANAGERIAL_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];

/** Shortcut umum: hanya OWNER yang boleh mengakses fitur sensitif (mis. AI advisor, laporan keuangan penuh). */
export const OWNER_ONLY_ROLES: UserRole[] = [UserRole.OWNER];
