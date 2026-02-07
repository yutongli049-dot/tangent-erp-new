import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ⚠️ 注意：这里加了 async
export const createClient = async () => {
  // ⚠️ 注意：这里加了 await
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Server Actions 中设置 cookie 不需要处理，Next.js 会自动处理
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // 同上
          }
        },
      },
    }
  );
};