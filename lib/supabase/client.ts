import { createBrowserClient } from "@supabase/ssr";
import { AUTH_COOKIE_MAX_AGE, authClientOptions } from "@/lib/supabase/auth-options";

const REMEMBER_ME_KEY = "tangent-remember-me";

export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== "0";
}

export function setRememberMe(remember: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REMEMBER_ME_KEY, remember ? "1" : "0");
}

export function createClient() {
  const remember = getRememberMe();
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: authClientOptions,
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        ...(remember ? { maxAge: AUTH_COOKIE_MAX_AGE } : {}),
      },
    }
  );
}
