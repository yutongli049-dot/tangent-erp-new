import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_MAX_AGE } from "@/lib/supabase/auth-options";

function isAuthTokenCookie(name: string) {
  return name.includes("-auth-token");
}

function withRefreshCookieOptions(options: Record<string, unknown> = {}) {
  const maxAge =
    typeof options.maxAge === "number" && options.maxAge > 0
      ? options.maxAge
      : AUTH_COOKIE_MAX_AGE;
  return {
    ...options,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge,
  };
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(
              name,
              value,
              withRefreshCookieOptions(options ?? {})
            );
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = pathname.startsWith("/login");
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => isAuthTokenCookie(cookie.name));

  if (!user && !isLogin && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
