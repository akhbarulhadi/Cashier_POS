import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Daftar prefix rute yang WAJIB login untuk diakses. */
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

  if (!user && isProtectedPath) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

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

  if (user && isAuthOnlyPath) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}
