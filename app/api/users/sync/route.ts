import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// POST /api/users/sync — update lastLogin & return profil lengkap dengan storeId
export async function POST() {
  return withApiHandler(async () => {
    const profile = await getAuthenticatedUser();

    const updated = await prisma.user.update({
      where: { id: profile.id },
      data: { lastLogin: new Date() },
      include: { store: { select: { id: true, name: true } } },
    });

    return apiSuccess(
      {
        id: updated.id,
        email: updated.email,
        fullName: updated.fullName,
        role: updated.role,
        isActive: updated.isActive,
        avatarUrl: updated.avatarUrl,
        storeId: updated.storeId,
        storeName: updated.store?.name ?? null,
      },
      "Sesi & profil pengguna berhasil disinkronkan."
    );
  });
}

/** GET /api/users/sync - mengembalikan profil user yang sedang login */
export async function GET() {
  return withApiHandler(async () => {
    const supabase = await createClient();
    const profile = await prisma.user.findFirst({
      where: { id: (await (await createClient()).auth.getUser()).data.user?.id },
      include: { store: { select: { id: true, name: true } } },
    });

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!profile) {
      return apiSuccess(
        { profile: null, hasActiveSession: Boolean(session) },
        "Profil pengguna aktif berhasil diambil."
      );
    }

    return apiSuccess(
      {
        profile: {
          id: profile.id,
          email: profile.email,
          fullName: profile.fullName,
          role: profile.role,
          isActive: profile.isActive,
          avatarUrl: profile.avatarUrl,
          storeId: profile.storeId,
          storeName: profile.store?.name ?? null,
        },
        hasActiveSession: Boolean(session),
      },
      "Profil pengguna aktif berhasil diambil."
    );
  });
}
