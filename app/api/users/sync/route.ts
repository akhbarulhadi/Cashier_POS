import { prisma } from "@/lib/prisma";
import { apiSuccess, withApiHandler } from "@/lib/api-response";
import { getAuthenticatedUser } from "@/lib/auth-helpers";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/users/sync
 * ------------------------------------------------------------------------
 * Endpoint fallback untuk memastikan sesi Supabase Auth yang aktif memiliki
 * padanan profil di `public.users`. Dipanggil oleh client tepat setelah
 * proses login berhasil (lihat halaman login di TAHAP 4).
 *
 * Dalam kondisi normal, trigger SQL `on_auth_user_created` sudah menangani
 * ini secara otomatis. Endpoint ini murni sebagai jaring pengaman tambahan
 * dan juga dipakai untuk mencatat `lastLogin`.
 */
export async function POST() {
  return withApiHandler(async () => {
    const profile = await getAuthenticatedUser();

    const updated = await prisma.user.update({
      where: { id: profile.id },
      data: { lastLogin: new Date() },
    });

    return apiSuccess(updated, "Sesi & profil pengguna berhasil disinkronkan.");
  });
}

/** GET /api/users/sync - mengembalikan profil user yang sedang login (dipakai UI header/sidebar) */
export async function GET() {
  return withApiHandler(async () => {
    const supabase = await createClient();
    const profile = await getAuthenticatedUser();

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return apiSuccess(
      { profile, hasActiveSession: Boolean(session) },
      "Profil pengguna aktif berhasil diambil."
    );
  });
}
