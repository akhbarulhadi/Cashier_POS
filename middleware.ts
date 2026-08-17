import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Cocokkan semua path KECUALI yang diawali dengan:
     * - _next/static (file statis)
     * - _next/image (optimasi gambar)
     * - favicon.ico, gambar umum
     * Middleware tetap berjalan untuk /api agar proteksi sesi API konsisten.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
