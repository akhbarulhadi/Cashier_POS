import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase Client - Server Side
 * ----------------------------------------------------------------------------
 * Dipakai di dalam Server Components, Server Actions, dan Route Handlers
 * (`app/api/**\/route.ts`). Sesi dibaca/ditulis lewat cookie store Next.js.
 *
 * Catatan: Pemanggilan `cookies().set()` di dalam Server Component murni akan
 * di-ignore oleh Next.js (read-only). Ini aman selama middleware sudah
 * menangani refresh token secara berkala (lihat `utils/supabase/middleware.ts`).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Diabaikan jika dipanggil dari Server Component (read-only context).
            // Middleware bertanggung jawab me-refresh sesi pada kasus ini.
          }
        },
      },
    }
  );
}

/**
 * Supabase Client dengan Service Role Key.
 * ----------------------------------------------------------------------------
 * HANYA dipakai di server (API routes tertentu) untuk operasi administratif
 * yang butuh bypass Row Level Security, contoh: sinkronisasi profil user,
 * operasi admin pada auth.users. JANGAN PERNAH expose ke client.
 */
export function createServiceRoleClient() {
  return createSupabaseJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
