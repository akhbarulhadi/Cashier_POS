import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Daftar prefix rute yang WAJIB login untuk diakses.
 * Route group `(dashboard)` & `(auth)` tidak muncul di URL, jadi path aktual
 * adalah nama foldernya langsung (mis. /pos, /dashboard, /products, dst).
 */
const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/pos",
  "/products",
  "/categories",
  "/customers",
  "/transactions",
  "/users",
  "/reports",
  "/ai-assistant",
  "/settings",
  "/print",
];

/** Rute publik yang tidak boleh diakses kalau user SUDAH login (redirect ke dashboard). */
const AUTH_ONLY_PATHS = ["/login", "/register", "/forgot-password"];

/** Prefix API yang dikecualikan dari proteksi sesi wajib (mis. callback OAuth). */
const PUBLIC_API_PREFIXES = ["/api/auth/callback"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // PENTING: JANGAN hapus baris ini. `getUser()` akan me-refresh token secara
  // otomatis jika sudah kedaluwarsa, dan menuliskan cookie baru lewat setAll().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const isProtectedPath = PROTECTED_PATH_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isApiPath = pathname.startsWith("/api");
  const isPublicApiPath = PUBLIC_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  // Belum login tapi mengakses halaman dashboard/protected -> redirect ke login
  if (!user && isProtectedPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Belum login tapi mengakses API yang dilindungi -> 401 JSON, bukan redirect HTML
  if (!user && isApiPath && !isPublicApiPath) {
    return NextResponse.json(
      {
        success: false,
        message: "Unauthorized. Sesi tidak ditemukan atau sudah kedaluwarsa.",
        code: "UNAUTHORIZED",
      },
      { status: 401 }
    );
  }

  // Sudah login tapi mengakses halaman login/register -> redirect ke dashboard
  if (user && isAuthOnlyPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
