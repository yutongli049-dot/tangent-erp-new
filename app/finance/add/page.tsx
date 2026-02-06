"use client";

import { useState } from "react";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Camera, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function AddTransactionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [type, setType] = useState("expense"); // 默认支出

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // 模拟网络请求
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsLoading(false);
    // 这里未来接 Supabase
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* 顶部：返回 + 标题 */}
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:-translate-y-[1px] hover:text-indigo-600 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              记一笔
            </h1>
            <p className="text-xs font-medium text-slate-400">
              记录新的流水账目
            </p>
          </div>
        </div>

        {/* 核心表单卡片 */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* 1. 收支切换 (Tabs) */}
            <Tabs
              defaultValue="expense"
              onValueChange={setType}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-slate-100/80 p-1">
                <TabsTrigger
                  value="expense"
                  className="rounded-lg text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-rose-600 data-[state=active]:shadow-sm"
                >
                  支出 (Expense)
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="rounded-lg text-xs font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-sm"
                >
                  收入 (Income)
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* 2. 金额输入 (大字体核心交互) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                金额 (Amount)
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <span className="text-xl font-bold text-slate-400">$</span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  step="0.01"
                  className="h-16 rounded-xl border-slate-200/70 bg-slate-50/50 pl-9 text-3xl font-bold tracking-tight text-slate-900 placeholder:text-slate-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  autoFocus
                />
              </div>
            </div>

            {/* 3. 分类与日期 (双列) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  分类 (Category)
                </Label>
                <Select>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 shadow-lg">
                    {/* 根据收支类型显示不同选项 */}
                    {type === "expense" ? (
                      <>
                        <SelectItem value="fuel">⛽ 油费</SelectItem>
                        <SelectItem value="food">🍱 餐饮</SelectItem>
                        <SelectItem value="equipment">🔧 器材</SelectItem>
                        <SelectItem value="marketing">📢 推广</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="tuition">🎓 学费</SelectItem>
                        <SelectItem value="service">📸 摄影服务</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  日期 (Date)
                </Label>
                <Input
                  type="date"
                  className="h-11 rounded-xl border-slate-200/70 bg-slate-50/50 font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  defaultValue={new Date().toISOString().split("T")[0]}
                />
              </div>
            </div>

            {/* 4. 备注 (Textarea) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                备注 (Notes)
              </Label>
              <Textarea
                placeholder="例如：更换丰田 Prius 机油..."
                className="resize-none rounded-xl border-slate-200/70 bg-slate-50/50 text-sm font-medium text-slate-700 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                rows={3}
              />
            </div>

            {/* 5. 凭证上传 (Style Upload) */}
            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                凭证 (Receipt)
              </Label>
              <div className="flex w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-6 transition-colors hover:bg-slate-50">
                <button
                  type="button"
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <div className="rounded-full bg-indigo-50 p-2 text-indigo-600">
                    <Camera className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    点击上传或拍照
                  </span>
                </button>
              </div>
            </div>

            {/* 6. 提交按钮 (Indigo Accent) */}
            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-xl bg-indigo-600 text-sm font-bold shadow-[0_1px_2px_rgba(79,70,229,0.2)] hover:bg-indigo-700 hover:shadow-[0_4px_12px_rgba(79,70,229,0.3)] active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "确认保存 (Save Transaction)"
              )}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}