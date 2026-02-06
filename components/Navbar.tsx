import BusinessSwitcher from "@/components/BusinessSwitcher";
import { Bell } from "lucide-react";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-xl">
      {/* 轻微底部阴影：让 header 有“浮在上面”的质感，但不厚重 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200/70 to-transparent" />

      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
        {/* 左侧：品牌锚点 + 业务切换器 */}
        <div className="flex items-center gap-3">
          {/* Quiet brand dot：比写logo更克制 */}
          <div className="h-2.5 w-2.5 rounded-full bg-indigo-500/80 shadow-[0_0_0_3px_rgba(99,102,241,0.12)]" />
          <div className="flex items-center gap-2">
            <BusinessSwitcher />
          </div>
        </div>

        {/* 右侧：状态区 */}
        <div className="flex items-center gap-2">
          {/* 通知按钮（先占位也不尴尬） */}
          <button
            className="group inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/70 bg-white/60 text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-indigo-200/70"
            aria-label="Notifications"
          >
            <Bell className="h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-[1.05]" />
          </button>

          {/* 用户头像：更企业级（细描边+中性底），状态点更克制 */}
          <button
            className="group relative inline-flex items-center gap-2 rounded-xl border border-slate-200/70 bg-white/60 px-2 py-1 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-indigo-200/70 active:translate-y-0"
            aria-label="User menu"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200/80">
              <span className="text-[11px] font-semibold tracking-tight">HL</span>

              {/* 在线状态：更小、更低饱和、更像SaaS */}
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>

            {/* 右侧留一个小的“身份提示”，会显得更像后台系统 */}
            <span className="hidden sm:inline text-xs font-medium text-slate-600">
              Henry
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
