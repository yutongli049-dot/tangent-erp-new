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
     * - login (登录页)
     * - auth (认证回调)
     * - api (✅ 新增：排除 API 接口，允许日历等外部工具在未登录状态下访问)
     */
    "/((?!_next/static|_next/image|favicon.ico|login|auth|api|register).*)",
  ],
};