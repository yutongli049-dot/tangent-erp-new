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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-xl bg-indigo-600 text-base font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98]"
    >
      {pending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "确认添加 (Add Student)"}
    </Button>
  );
}

export default function NewStudentPage() {
  const { currentBusinessId, currentLabel } = useBusiness();
  const [state, formAction] = useActionState(createStudent, null);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* 顶部导航 */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-[1px] hover:text-indigo-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              添加新学员
            </h1>
            <p className="text-xs font-medium text-slate-400">
              为 <span className="text-indigo-600 font-bold">{currentLabel}</span> 建立档案
            </p>
          </div>
        </div>

        {/* 核心表单 */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="businessId" value={currentBusinessId} />

            {/* 1. 姓名 */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                姓名 (Full Name)
              </Label>
              <div className="relative">
                <Input
                  name="name"
                  required
                  placeholder="例如：Michael Wang"
                  className="h-14 rounded-xl border-slate-200/70 bg-slate-50/50 pl-11 text-lg font-semibold text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                />
                <UserPlus className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {/* 2. 驾照阶段 (Level) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                当前阶段 (Current Level)
              </Label>
              <Select name="level" required defaultValue="Provisional">
                <SelectTrigger className="h-12 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700">
                  <SelectValue placeholder="选择阶段" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                  <SelectItem value="Provisional">🟡 Provisional (学习驾照)</SelectItem>
                  <SelectItem value="Restricted">🟠 Restricted (限制性驾照)</SelectItem>
                  <SelectItem value="Full">🟢 Full License (全驾照)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. 联系方式 (双列) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  电话 (Mobile)
                </Label>
                <Input
                  name="phone"
                  type="tel"
                  placeholder="021 123 4567"
                  className="h-12 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  邮箱 (Email) - 可选
                </Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="student@example.com"
                  className="h-12 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700"
                />
              </div>
            </div>

            {/* 错误提示 */}
            {state?.error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
                {state.error}
              </div>
            )}

            <SubmitButton />
          </form>
        </div>
      </div>
    </main>
  );
}