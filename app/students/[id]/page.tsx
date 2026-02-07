import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, CreditCard, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { TopUpButton } from "../[id]/top-up-button"; // 马上会写的客户端组件

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { id } = await params; // Next.js 15+ 这里的 params 需要 await (如果报错就把 await 去掉)

  // 1. 获取学员基本信息
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) return <div>查无此人</div>;

  // 2. 获取该学员的历史预约 (最近 10 条)
  const { data: bookings } = await supabase
    .from("bookings")
    .select("*")
    .eq("student_id", id)
    .order("start_time", { ascending: false })
    .limit(10);

  // 3. 获取该学员的缴费记录 (最近 10 条)
  const { data: payments } = await supabase
    .from("transactions")
    .select("*")
    .eq("student_id", id)
    .eq("type", "income") // 只看收入
    .order("transaction_date", { ascending: false })
    .limit(10);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* 顶部导航 */}
        <div className="mb-6 flex items-center gap-3">
          <Link href="/students" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">学员档案</h1>
        </div>

        {/* 1. 学员名片卡 (带充值按钮) */}
        <Card className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-sm">
          <div className="bg-indigo-600 px-6 py-8 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-white/20 text-white hover:bg-white/30 border-none">
                    {student.level}
                  </Badge>
                </div>
              </div>
              <div className="text-right">
                <p className="text-indigo-100 text-xs font-medium uppercase tracking-wider">剩余课时</p>
                <p className="text-4xl font-bold">{student.balance}</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                {student.phone || "无电话"}
              </div>
              <div className="flex items-center gap-2 text-slate-600 truncate">
                <Mail className="h-4 w-4 text-slate-400" />
                {student.email || "无邮箱"}
              </div>
            </div>

            {/* 充值按钮组件 (Client Component) */}
            <TopUpButton studentId={student.id} studentName={student.name} businessId={student.business_unit_id} />
          </div>
        </Card>

        {/* 2. 历史记录 Tabs */}
        <div className="mt-8 space-y-6">
          
          {/* 上课记录 */}
          <div>
            <h3 className="mb-3 ml-1 text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-indigo-600" /> 最近课程
            </h3>
            <div className="space-y-3">
              {bookings?.length === 0 && <p className="text-xs text-slate-400 pl-1">暂无上课记录</p>}
              {bookings?.map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${b.status === 'confirmed' ? 'bg-amber-400' : b.status === 'completed' ? 'bg-emerald-400' : 'bg-slate-300'}`} />
                    <span className="font-medium text-slate-700">
                      {new Date(b.start_time).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="text-slate-500 text-xs">{b.duration}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* 缴费记录 */}
          <div>
            <h3 className="mb-3 ml-1 text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-emerald-600" /> 缴费历史
            </h3>
            <div className="space-y-3">
              {payments?.length === 0 && <p className="text-xs text-slate-400 pl-1">暂无缴费记录</p>}
              {payments?.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 text-sm shadow-sm">
                  <span className="text-slate-600">
                    {new Date(p.transaction_date).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-emerald-600">
                    +${p.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}