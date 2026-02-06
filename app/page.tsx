"use client";

import Link from "next/link"; // ✅ 引入 Link 用于页面跳转
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowUpRight,
  CircleDollarSign,
  Users,
  CalendarClock,
  PenLine,
  CalendarPlus,
} from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900">
      {/* 顶部导航 */}
      <Navbar />

      <div className="mx-auto w-full max-w-5xl px-6 py-8 space-y-7">
        
        {/* 1) 核心财务卡片 */}
        <Card className="relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          {/* 顶部强调线 */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-indigo-500/80" />

          <CardHeader className="flex flex-row items-center justify-between space-y-0 px-7 pt-7 pb-3">
            <CardTitle className="text-[13px] font-medium text-slate-600">
              本月净收入 <span className="text-slate-400">(NZD)</span>
            </CardTitle>

            <div className="rounded-xl border border-slate-200/70 bg-slate-50 px-2.5 py-2 text-slate-700">
              <CircleDollarSign className="h-5 w-5" />
            </div>
          </CardHeader>

          <CardContent className="px-7 pb-7">
            <div className="text-5xl font-semibold tracking-tight tabular-nums text-slate-950">
              +$2,450.00
            </div>

            <div className="mt-4 flex items-center gap-2 text-sm">
              <span className="inline-flex items-center rounded-md border border-indigo-200/60 bg-indigo-50 px-2 py-0.5 text-indigo-700 font-medium tabular-nums">
                <ArrowUpRight className="mr-1 h-3.5 w-3.5" />
                12%
              </span>
              <span className="text-slate-400">较上月</span>
            </div>
          </CardContent>
        </Card>

        {/* 2) 运营指标 */}
        <div className="grid grid-cols-2 gap-5">
          <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-[1px] hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2">
              <CardTitle className="text-[13px] font-medium text-slate-600">
                活跃学员
              </CardTitle>
              <div className="rounded-lg border border-slate-200/70 bg-slate-50 p-2 text-slate-600">
                <Users className="h-4.5 w-4.5" />
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              <div className="text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
                12
              </div>
              <p className="mt-2 text-xs text-slate-500">
                本周新增{" "}
                <span className="font-semibold text-slate-900 tabular-nums">
                  1
                </span>{" "}
                人
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-[1px] hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2">
              <CardTitle className="text-[13px] font-medium text-slate-600">
                待完成课程
              </CardTitle>

              <div className="rounded-lg border border-amber-200/50 bg-amber-50 p-2 text-amber-700">
                <CalendarClock className="h-4.5 w-4.5" />
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-6 pt-0">
              <div className="text-3xl font-semibold tracking-tight tabular-nums text-slate-950">
                5
              </div>
              <p className="mt-2 text-xs text-slate-500">未来 7 天</p>
            </CardContent>
          </Card>
        </div>

        {/* 3) 快速操作区 (Quick Actions) */}
        <div className="pt-1">
          <h3 className="mb-3 ml-1 text-[11px] font-semibold text-slate-400 uppercase tracking-[0.18em]">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-4">
            {/* ✅ 按钮 1: 记一笔 (改为 Link 跳转) */}
            <Link 
              href="/finance/add" 
              className="group relative flex h-24 flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all active:scale-[0.99] hover:-translate-y-[1px] hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-indigo-200/70"
            >
              <div className="mb-2 rounded-xl border border-indigo-200/60 bg-indigo-50 p-3 text-indigo-700 transition-transform duration-200 group-hover:scale-[1.05]">
                <PenLine className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                记一笔
              </span>
            </Link>

            {/* 按钮 2: 新建预约 (暂时保留为 button，或者你可以改成 Link href="/bookings/new") */}
            <button className="group relative flex h-24 flex-col items-center justify-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all active:scale-[0.99] hover:-translate-y-[1px] hover:shadow-[0_10px_25px_rgba(15,23,42,0.08)] focus:outline-none focus:ring-2 focus:ring-indigo-200/70">
              <div className="mb-2 rounded-xl border border-slate-200/70 bg-slate-50 p-3 text-slate-700 transition-transform duration-200 group-hover:scale-[1.05]">
                <CalendarPlus className="h-6 w-6" />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                新建预约
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}