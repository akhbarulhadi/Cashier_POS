import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import {
  getAuthenticatedUser,
  requireRole,
  MANAGERIAL_ROLES,
  OWNER_ONLY_ROLES,
} from "@/lib/auth-helpers";
import { updateUserSchema } from "@/lib/validations/user.schema";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** GET /api/users/:id */
export async function GET(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();
    const { id } = await params;

    // User biasa hanya boleh melihat profilnya sendiri; manajerial boleh melihat semua.
    const isManagerial = currentUser.role === "OWNER" || currentUser.role === "ADMIN";
    if (!isManagerial && currentUser.id !== id) {
      throw ApiError.forbidden();
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        avatarUrl: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    if (!user) throw ApiError.notFound("User not found.");

    return apiSuccess(user, "User details successfully retrieved.");
  });
}

/** PATCH /api/users/:id - update profil/role (khusus OWNER untuk ubah role) */
export async function PATCH(request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();
    const { id } = await params;

    const body = await request.json();
    const data = updateUserSchema.parse(body);

    const isSelf = currentUser.id === id;
    const isManagerial = currentUser.role === "OWNER" || currentUser.role === "ADMIN";

    if (!isSelf && !isManagerial) throw ApiError.forbidden();

    // Hanya OWNER yang boleh mengubah role atau status aktif pengguna lain.
    if ((data.role || data.isActive !== undefined) && !isSelf) {
      requireRole(currentUser, OWNER_ONLY_ROLES);
    }
    // User biasa tidak boleh menaikkan role dirinya sendiri.
    if (isSelf && data.role && currentUser.role !== "OWNER") {
      throw ApiError.forbidden("Anda tidak dapat mengubah role Anda sendiri.");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("User not found.");

    const updated = await prisma.user.update({ where: { id }, data });

    return apiSuccess(updated, "User data successfully updated.");
  });
}

/** DELETE /api/users/:id - nonaktifkan akun staff (khusus OWNER) */
export async function DELETE(_request: NextRequest, { params }: Params) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();
    requireRole(currentUser, OWNER_ONLY_ROLES);
    const { id } = await params;

    if (currentUser.id === id) {
      throw ApiError.badRequest("Anda tidak dapat menonaktifkan akun Anda sendiri.");
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) throw ApiError.notFound("User not found.");

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: false, deletedAt: new Date() },
    });

    // Nonaktifkan juga akses login di Supabase Auth agar konsisten.
    try {
      const supabaseAdmin = createServiceRoleClient();
      await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "876000h" });
    } catch (e) {
      console.error("[SUPABASE_ADMIN_BAN_FAILED]", e);
      // Tidak menggagalkan request utama; status Prisma sudah konsisten (isActive: false)
      // dan middleware/getAuthenticatedUser tetap akan menolak user ini.
    }

    return apiSuccess(updated, "Akun pengguna berhasil dinonaktifkan.");
  });
}
