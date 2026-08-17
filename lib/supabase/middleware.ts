import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

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
            supabaseResponse.cookies.set(name, value, withRefreshCookieOptions(options ?? {}));
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
  const hasAuthCookie = request.cookies.getAll().some((cookie) => isAuthTokenCookie(cookie.name));

  // PWA 冷启动 / 切回前台时 access token 可能正在刷新：
  // 只要本地还留着 auth cookie，就不要立刻踢回登录页。
  if (!user && !isLogin && !hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
