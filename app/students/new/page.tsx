"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { createStudent } from "../actions";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, UserPlus, BookOpen, User, Hash, DollarSign } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-xl bg-indigo-600 text-base font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]"
    >
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "确认创建档案 (Create Profile)"}
    </Button>
  );
}

export default function NewStudentPage() {
  const { currentBusinessId, currentLabel } = useBusiness();
  const [state, formAction] = useActionState(createStudent, null);

  // ✅ 定义不同公司的科目选项
  const subjects = currentBusinessId === 'sine' 
    ? ["Road Fam (新手上路)", "Restricted License (限制性)", "Full License (全驾照)"]
    : ["NCEA L1 Math", "NCEA L2 Math", "NCEA L3 Math", "NCEA L1 Physics", "NCEA L2 Physics", "NCEA L3 Physics", "NCEA L1 Chemistry", "NCEA L2 Chemistry", "IG 1 Math", "IG 2 Math", "AS Math", "A2 Math", "IG 1 Physics", "IG 2 Physics", "AS Physics", "A2 Physics", "IG 1 Chemistry", "IG 2 Chemistry", "AS Chemistry", "A2 Chemistry"];

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/students"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-[1px] hover:text-indigo-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">录入新学员</h1>
            <p className="text-xs font-medium text-slate-400">
              当前业务线: <span className="text-indigo-600 font-bold">{currentLabel}</span>
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <form action={formAction} className="space-y-8">
            <input type="hidden" name="businessId" value={currentBusinessId} />

            {/* 1. 核心身份信息 */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* 姓名 */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">学员姓名 (Name)</Label>
                <div className="relative">
                  <Input name="name" required placeholder="例如：Michael Wang" className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200" />
                  <UserPlus className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* ✅ 学员编号 */}
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">学员编号 (Student ID)</Label>
                <div className="relative">
                  <Input name="studentCode" placeholder="例如：S2026001" className="pl-10 h-12 rounded-xl bg-slate-50/50 border-slate-200" />
                  <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* 2. 教学设置 */}
            <div className="rounded-xl bg-slate-50/50 p-5 border border-slate-100 space-y-6">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" /> 教学配置
              </h3>
              
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* ✅ 动态科目 */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">学习科目 (Subject)</Label>
                  <Select name="subject">
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200"><SelectValue placeholder="选择科目" /></SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* 阶段/Level */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">当前阶段 (Level)</Label>
                  <Select name="level" defaultValue="Provisional">
                    <SelectTrigger className="h-11 rounded-xl bg-white border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Achieved">Achieved / 基础</SelectItem>
                      <SelectItem value="Merit">Merit / 进阶</SelectItem>
                      <SelectItem value="Excellence">Excellence / 高级</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* ✅ 负责老师 */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">负责老师 (Teacher)</Label>
                  <div className="relative">
                    <Input name="teacher" placeholder="例如：Henry Liu" className="pl-10 h-11 rounded-xl bg-white border-slate-200" />
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                {/* ✅ 课时费率 */}
                <div className="space-y-2">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">课时费率 (Hourly Rate)</Label>
                  <div className="relative">
                    <Input name="hourlyRate" type="number" placeholder="0.00" className="pl-10 h-11 rounded-xl bg-white border-slate-200" />
                    <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <p className="text-[10px] text-slate-400">用于计算剩余金额 (Rate × Balance)</p>
                </div>
              </div>
            </div>

            {/* 3. 联系方式 */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">电话 (Mobile)</Label>
                <Input name="phone" placeholder="021 123 4567" className="h-11 rounded-xl bg-slate-50/50 border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">邮箱 (Email)</Label>
                <Input name="email" placeholder="student@example.com" className="h-11 rounded-xl bg-slate-50/50 border-slate-200" />
              </div>
            </div>

            {state?.error && <p className="text-sm text-red-500">{state.error}</p>}
            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}