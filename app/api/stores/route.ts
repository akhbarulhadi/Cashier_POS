import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { ApiError } from "@/lib/api-error";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { UserRole } from "@prisma/client";

export const dynamic = "force-dynamic";

const registerStoreSchema = z.object({
  // Store Data
  storeName: z.string().trim().min(2, "Store name must be at least 2 characters.").max(150),
  storeAddress: z.string().trim().max(500).optional().nullable(),
  storePhone: z.string().trim().max(30).optional().nullable(),
  storeEmail: z.string().trim().email("Invalid store email format.").optional().nullable(),
  // OWNER Data
  ownerName: z.string().trim().min(2, "Owner name must be at least 2 characters.").max(150),
  ownerEmail: z.string().trim().email("Invalid email format."),
  ownerPassword: z.string().min(8, "Password must be at least 8 characters."),
});

/** POST /api/stores/register */
export async function POST(request: NextRequest) {
  return withApiHandler(async () => {
    const body = await request.json();
    const data = registerStoreSchema.parse(body);

    const supabaseAdmin = createServiceRoleClient();

    // Create Supabase Auth account for OWNER
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.ownerEmail,
        password: data.ownerPassword,
        email_confirm: true,
        user_metadata: {
          full_name: data.ownerName,
          role: UserRole.OWNER,
        },
      });

    if (authError || !authData?.user) {
      throw ApiError.badRequest(
        authError?.message ?? "Failed to create user account in Supabase Auth."
      );
    }

    const authUserId = authData.user.id;

    try {
      // Create Store & Upsert User in a single Prisma transaction
      const result = await prisma.$transaction(async (tx) => {
        const store = await tx.store.create({
          data: {
            name: data.storeName,
            address: data.storeAddress ?? null,
            phone: data.storePhone ?? null,
            email: data.storeEmail ?? null,
          },
        });

        const owner = await tx.user.upsert({
          where: { id: authUserId },
          update: {
            fullName: data.ownerName,
            role: UserRole.OWNER,
            storeId: store.id,
          },
          create: {
            id: authUserId,
            email: data.ownerEmail,
            fullName: data.ownerName,
            role: UserRole.OWNER,
            storeId: store.id,
          },
        });

        return { store, owner };
      });

      return apiSuccess(
        {
          storeId: result.store.id,
          storeName: result.store.name,
          ownerId: result.owner.id,
          ownerEmail: result.owner.email,
        },
        "Store and owner account successfully registered. Please log in.",
        201
      );
    } catch (prismaError) {
      // Rollback Supabase Auth user if Prisma fails
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => { });
      throw prismaError;
    }
  });
}
