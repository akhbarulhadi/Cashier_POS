import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import {
  getAuthenticatedUserWithStore,
  requireRole,
  MANAGERIAL_ROLES,
  OWNER_ONLY_ROLES,
} from "@/lib/auth-helpers";
import { createUserSchema, userQuerySchema } from "@/lib/validations/user.schema";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { ApiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

/** GET /api/users - list staff dalam toko yang sama (OWNER/ADMIN) */
export async function GET(request: NextRequest) {
  return withApiHandler(async () => {
    const currentUser = await getAuthenticatedUserWithStore();
    requireRole(currentUser, MANAGERIAL_ROLES);

    const query = userQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const where: Prisma.UserWhereInput = {
      storeId: currentUser.storeId,
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
    const currentUser = await getAuthenticatedUserWithStore();
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

    // Upsert profil Prisma dan ikat ke toko OWNER yang membuat
    const newUser = await prisma.user.upsert({
      where: { id: authData.user.id },
      update: {
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        storeId: currentUser.storeId,
      },
      create: {
        id: authData.user.id,
        email: data.email,
        fullName: data.fullName,
        phone: data.phone,
        role: data.role,
        storeId: currentUser.storeId,
      },
    });

    return apiSuccess(newUser, "Akun staff/cashier berhasil dibuat.", 201);
  });
}
