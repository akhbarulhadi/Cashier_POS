"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase Client - Browser Side
 * ----------------------------------------------------------------------------
 * Dipakai di dalam Client Components ("use client"). Mengelola sesi otomatis
 * lewat cookies yang kompatibel dengan Server Components/Middleware.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
