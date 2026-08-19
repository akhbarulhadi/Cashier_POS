import { UserRole, type User as PrismaUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { createClient } from "@/utils/supabase/server";

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
 * Sama dengan getAuthenticatedUser() tetapi juga memastikan user sudah terikat ke
 * sebuah toko (storeId tidak null). Gunakan ini di semua endpoint yang membutuhkan
 * isolasi data per toko.
 */
export async function getAuthenticatedUserWithStore(): Promise<PrismaUser & { storeId: string }> {
  const user = await getAuthenticatedUser();
  if (!user.storeId) {
    throw ApiError.forbidden(
      "Akun Anda belum terikat ke toko manapun. Hubungi pemilik toko untuk mendapatkan akses."
    );
  }
  return user as PrismaUser & { storeId: string };
}

/**
 * Guard: Memastikan resource yang diakses berada dalam toko yang sama dengan user.
 * Lempar 403 jika storeId tidak cocok.
 */
export function requireSameStore(userStoreId: string, resourceStoreId: string | null | undefined) {
  if (!resourceStoreId || userStoreId !== resourceStoreId) {
    throw ApiError.forbidden("Anda tidak memiliki akses ke resource ini.");
  }
}

export function requireRole(user: PrismaUser, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(user.role)) {
    throw ApiError.forbidden(
      `Aksi ini hanya diizinkan untuk role: ${allowedRoles.join(", ")}.`
    );
  }
}

export const MANAGERIAL_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];

export const OWNER_ONLY_ROLES: UserRole[] = [UserRole.OWNER];
