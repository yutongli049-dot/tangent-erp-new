"use client";

import { useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calendar, Clock, Loader2, MapPin, User } from "lucide-react";

export default function NewBookingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState("1"); // 默认 1 小时

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // 模拟提交延时
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* 顶部导航 */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-[1px] hover:text-indigo-600 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              新建预约
            </h1>
            <p className="text-xs font-medium text-slate-400">
              安排新的课程或服务
            </p>
          </div>
        </div>

        {/* 核心表单区域 */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <form onSubmit={handleSubmit} className="space-y-7">
            
            {/* 1. 学员选择 (Student) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                学员 (Student)
              </Label>
              <Select>
                <SelectTrigger className="h-14 rounded-xl border-slate-200/70 bg-slate-50/50 px-4 text-base font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                      <User className="h-4 w-4" />
                    </div>
                    <SelectValue placeholder="选择学员..." />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="s1">Alex (Provisional)</SelectItem>
                  <SelectItem value="s2">Bella (Restricted)</SelectItem>
                  <SelectItem value="s3">Charlie (Full License)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. 日期与时间 (Date & Time) - 移动端优先的大点击区 */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  开始时间 (Start)
                </Label>
                <div className="relative">
                  <Input
                    type="datetime-local"
                    className="h-14 rounded-xl border-slate-200/70 bg-slate-50/50 px-4 text-sm font-semibold text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  />
                  <Calendar className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* 时长选择 (Duration) - iOS 分段风格 */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  时长 (Duration)
                </Label>
                <div className="flex h-14 w-full rounded-xl border border-slate-200/70 bg-slate-50/50 p-1">
                  {["1", "1.5", "2"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDuration(val)}
                      className={`flex-1 rounded-lg text-sm font-semibold transition-all ${
                        duration === val
                          ? "bg-white text-indigo-600 shadow-sm ring-1 ring-black/5"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {val}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. 地点 (Location) - 可选 */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                接送地点 (Location)
              </Label>
              <div className="relative">
                <Input
                  placeholder="默认地点或输入新地址..."
                  className="h-12 rounded-xl border-slate-200/70 bg-slate-50/50 pl-11 text-sm font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                />
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2">
                  <MapPin className="h-5 w-5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* 4. 备注 (Notes) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                课程备注 (Notes)
              </Label>
              <Textarea
                placeholder="例如：重点练习侧方停车..."
                className="resize-none rounded-xl border-slate-200/70 bg-slate-50/50 text-sm font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                rows={3}
              />
            </div>

            {/* 5. 提交按钮 */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-14 w-full rounded-xl bg-indigo-600 text-base font-bold text-white shadow-[0_1px_2px_rgba(79,70,229,0.2)] transition-all hover:bg-indigo-700 hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Creating...
                </>
              ) : (
                "确认预约 (Confirm Booking)"
              )}
            </Button>
            
          </form>
        </div>
      </div>
    </main>
  );
}