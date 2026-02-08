import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, User, BookOpen, Clock, Wallet } from "lucide-react";
// ✅ 修复：去掉大括号，使用 default import
import TopUpButton from "./top-up-button"; 

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) {
    notFound();
  }

  // 计算预计剩余金额 (余额 * 费率)
  const estimatedValue = (student.balance || 0) * (student.hourly_rate || 0);

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex justify-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link href="/students">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-900">学员档案</h1>
        </div>

        {/* Main Info Card */}
        <Card className="shadow-md border-indigo-100 overflow-hidden">
          <div className="bg-slate-50/50 p-6 border-b border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-2xl">
                {student.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{student.name}</h2>
                <p className="text-sm text-slate-500 flex items-center gap-2">
                  <span className="bg-slate-200 px-2 py-0.5 rounded text-xs font-mono">{student.student_id_code || "无学号"}</span>
                </p>
              </div>
            </div>
            
            {/* ✅ 充值按钮 */}
            <TopUpButton studentId={student.id} />
          </div>
          
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 p-8">
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">课时余额 (Balance)</p>
              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${Number(student.balance) <= 3 ? 'text-rose-600' : 'text-slate-900'}`}>
                  {Number(student.balance)}
                </span>
                <span className="text-sm text-slate-500 font-bold">Hrs</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">当前费率 (Rate)</p>
              <div className="flex items-center gap-2 text-slate-700">
                <Wallet className="h-4 w-4 text-indigo-400" />
                <span className="font-bold">${student.hourly_rate} / hr</span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">科目信息 (Subject)</p>
              <div className="flex items-center gap-2 text-slate-700">
                <BookOpen className="h-4 w-4 text-indigo-400" />
                <span className="font-medium">{student.subject || "未设置"}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                <User className="h-3 w-3" /> 老师: {student.teacher || "未分配"}
              </div>
            </div>
          </CardContent>
          
          {/* Footer Info */}
          <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
             <div className="text-xs text-slate-400">
               预计剩余价值: <span className="font-bold text-slate-600">${estimatedValue.toFixed(2)}</span>
             </div>
             <div className="text-xs text-slate-300">ID: {student.id}</div>
          </div>
        </Card>
      </div>
    </main>
  );
}