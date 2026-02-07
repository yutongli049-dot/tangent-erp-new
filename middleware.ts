// middleware.ts
import { type NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (图标)
     * - login (登录页自己不能被保护，否则死循环)
     * - auth (如果未来有 API 路由)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|auth).*)",
  ],
};