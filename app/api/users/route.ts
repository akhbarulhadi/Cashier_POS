import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import {
  getAuthenticatedUser,
  requireRole,
  MANAGERIAL_ROLES,
  OWNER_ONLY_ROLES,
} from "@/lib/auth-helpers";
import { createUserSchema, userQuerySchema } from "@/lib/validations/user.schema";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/** GET /api/users - list staff/cashier (khusus OWNER/ADMIN) */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();
    requireRole(currentUser, MANAGERIAL_ROLES);

    const query = userQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.search
        ? {
          OR: [
            { fullName: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          lastLogin: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return apiSuccess(users, "User list successfully retrieved.", 200, {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    });
  });
}

/** POST /api/users - membuat akun staff/cashier baru (khusus OWNER) */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUser();
    requireRole(currentUser, OWNER_ONLY_ROLES);

    const body = await request.json();
    const data = createUserSchema.parse(body);

    const supabaseAdmin = createServiceRoleClient();

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName, role: data.role },
      });

    if (authError || !authData?.user) {
      throw ApiError.badRequest(
        authError?.message ?? "Failed membuat akun pengguna di Supabase Auth."
      );
    }

    // Pastikan profil Prisma sesuai (trigger DB seharusnya sudah membuatnya,
    const newUser = await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
      },
      create: {
        id: authData.user.id,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
      },
    });

    return apiSuccess(newUser, "Akun staff/cashier berhasil dibuat.", 201);
  });
}
