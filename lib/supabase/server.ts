import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { authClientOptions, withAuthCookieOptions } from "@/lib/supabase/auth-options";

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: authClientOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, withAuthCookieOptions(options ?? {}));
            });
          } catch {
            // Server Components 中设置 cookie 会抛错，middleware / Server Actions 会写入
          }
        },
      },
    }
  );
};
