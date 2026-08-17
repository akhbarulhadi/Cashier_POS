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

export function requireRole(user: PrismaUser, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(user.role)) {
    throw ApiError.forbidden(
      `Aksi ini hanya diizinkan untuk role: ${allowedRoles.join(", ")}.`
    );
  }
}

export const MANAGERIAL_ROLES: UserRole[] = [UserRole.OWNER, UserRole.ADMIN];

export const OWNER_ONLY_ROLES: UserRole[] = [UserRole.OWNER];
