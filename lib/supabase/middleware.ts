import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

function withEdgeAuthCookieOptions(options: Record<string, unknown> = {}) {
  return {
    path: "/",
    sameSite: "lax" as const,
    maxAge:
      typeof options.maxAge === "number" && options.maxAge > 0
        ? options.maxAge
        : AUTH_COOKIE_MAX_AGE,
    ...options,
  };
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          const cookie = {
            name,
            value,
            ...withEdgeAuthCookieOptions(options),
          };
          request.cookies.set(cookie);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set(cookie);
        },
        remove(name: string, options: Record<string, unknown>) {
          const cookie = {
            name,
            value: "",
            ...withEdgeAuthCookieOptions(options),
            maxAge: 0,
          };
          request.cookies.set(cookie);
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set(cookie);
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
