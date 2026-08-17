import { createBrowserClient } from "@supabase/ssr";
import { authClientOptions, authCookieOptions } from "@/lib/supabase/auth-options";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: authClientOptions,
      cookieOptions: authCookieOptions,
    }
  );
}
