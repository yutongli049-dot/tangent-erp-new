/** Auth cookie / session 默认维持 60 天，避免 PWA 每次冷启动被踢出 */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 60;

export const authCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: AUTH_COOKIE_MAX_AGE,
};

export const authClientOptions = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
};

export function withAuthCookieOptions(options: Record<string, unknown> = {}) {
  return {
    ...authCookieOptions,
    ...options,
    maxAge:
      typeof options.maxAge === "number" && options.maxAge > 0
        ? options.maxAge
        : AUTH_COOKIE_MAX_AGE,
    path: (options.path as string) || "/",
    sameSite: (options.sameSite as "lax" | "strict" | "none") || "lax",
    secure:
      typeof options.secure === "boolean"
        ? options.secure
        : process.env.NODE_ENV === "production",
  };
}
