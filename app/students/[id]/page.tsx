import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Phone, Mail, User, BookOpen, Wallet, Clock, Hash, DollarSign } from "lucide-react";
import Link from "next/link";
import { TopUpButton } from "./top-up-button";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. 获取学员信息
  const { data: student } = await supabase.from("students").select("*").eq("id", id).single();
  
  if (!student) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">查无此人</h1>
          <Link href="/students" className="text-indigo-600 hover:underline">返回列表</Link>
        </div>
      </div>
    );
  }

  // 2. 获取财务汇总 (计算预付金额)
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, quantity, type")
    .eq("student_id", id)
    .eq("type", "income"); // 只算充值

  // 计算逻辑
  const totalPrepaidAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalPrepaidHours = transactions?.reduce((sum, t) => sum + Number(t.quantity || 0), 0) || 0;
  
  // 核心公式：剩余金额 = 剩余课时 * 课时费率
  const hourlyRate = Number(student.hourly_rate || 0);
  const remainingHours = Number(student.balance);
  
  const remainingAmount = remainingHours * hourlyRate;
  const consumedAmount = totalPrepaidAmount - remainingAmount; // 已核销 = 总充值 - 剩余价值

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/students" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">学员档案</h1>
        </div>

        {/* 1. 顶部名片 */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm mb-6">
          <div className="bg-slate-900 px-6 py-8 text-white">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-3xl font-bold">{student.name}</h2>
                  <Badge variant="secondary" className="bg-white/20 text-white hover:bg-white/30 border-none">
                    {student.student_code || "无编号"}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-slate-400 text-sm">
                  <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {student.subject || "未设置科目"}</span>
                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> 老师: {student.teacher || "待定"}</span>
                  <span className="flex items-center gap-1"><Badge variant="outline" className="text-slate-300 border-slate-600">{student.level}</Badge></span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">剩余课时</p>
                <p className="text-4xl font-bold text-emerald-400">{student.balance} <span className="text-lg text-emerald-600/80">h</span></p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
             <div className="grid grid-cols-2 gap-4 text-sm mb-6">
               <div className="flex items-center gap-2 text-slate-600"><Phone className="h-4 w-4 text-slate-400" /> {student.phone || "无电话"}</div>
               <div className="flex items-center gap-2 text-slate-600"><Mail className="h-4 w-4 text-slate-400" /> {student.email || "无邮箱"}</div>
             </div>
             {/* 充值按钮 */}
             <TopUpButton studentId={student.id} studentName={student.name} businessId={student.business_unit_id} />
          </div>
        </Card>

        {/* 2. 核心财务看板 (Financial Stats) */}
        <h3 className="mb-3 ml-1 text-xs font-bold text-slate-400 uppercase tracking-wider">财务概览 (Financials)</h3>
        <div className="grid grid-cols-2 gap-4 mb-8">
          
          {/* 预付总额 */}
          <Card className="p-5 border-slate-200/60 bg-white">
             <div className="flex items-center gap-2 text-slate-500 mb-1">
               <Wallet className="h-4 w-4 text-indigo-500" />
               <span className="text-xs font-semibold uppercase">预付总额</span>
             </div>
             <div className="text-2xl font-bold text-slate-900">${totalPrepaidAmount}</div>
             <div className="text-xs text-slate-400 mt-1">共充值 {totalPrepaidHours} 课时</div>
          </Card>

          {/* 已核销 (Consumed) */}
          <Card className="p-5 border-slate-200/60 bg-white">
             <div className="flex items-center gap-2 text-slate-500 mb-1">
               <Clock className="h-4 w-4 text-amber-500" />
               <span className="text-xs font-semibold uppercase">已核销金额</span>
             </div>
             {/* 如果计算出来是负数(数据误差)，就显示0 */}
             <div className="text-2xl font-bold text-slate-900">${Math.max(0, consumedAmount).toFixed(2)}</div>
             <div className="text-xs text-slate-400 mt-1">基于当前费率计算</div>
          </Card>

          {/* 剩余价值 (Remaining) */}
          <Card className="p-5 border-slate-200/60 bg-emerald-50 border-emerald-100 col-span-2">
             <div className="flex justify-between items-center">
               <div>
                 <div className="flex items-center gap-2 text-emerald-700 mb-1">
                   <DollarSign className="h-4 w-4" />
                   <span className="text-xs font-bold uppercase">账户剩余价值 (Est. Value)</span>
                 </div>
                 <div className="text-3xl font-bold text-emerald-900">${remainingAmount.toFixed(2)}</div>
               </div>
               <div className="text-right text-xs text-emerald-600">
                 <p>当前费率: ${hourlyRate}/h</p>
                 <p>剩余课时: {remainingHours}h</p>
               </div>
             </div>
          </Card>
        </div>
      </div>
    </main>
  );
}