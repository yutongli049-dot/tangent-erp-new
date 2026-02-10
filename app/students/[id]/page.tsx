import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { 
  ArrowLeft, User, BookOpen, Wallet, Clock, 
  Home as HomeIcon, Users, Calendar as CalendarIcon, FileBarChart, PenLine,
  History, ArrowUpRight, ArrowDownRight, MapPin, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import TopUpButton from "./top-up-button"; 
import EditStudentButton from "./edit-button";
import { getStudentHistory } from "../actions"; // ✅ 引入新Action

// 底部导航 (保持一致)
const TabItem = ({ href, icon: Icon, label, isActive }: any) => (
  <Link href={href} className={`flex flex-col items-center justify-center gap-1 flex-1 active:scale-95 transition-transform py-2 group ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
    <div className={`h-6 w-6 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
      <Icon className="h-full w-full" />
    </div>
    <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{label}</span>
  </Link>
);

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. 获取学员基础信息
  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) notFound();

  // 2. ✅ 获取历史记录
  const { bookings, transactions } = await getStudentHistory(id);

  const estimatedValue = (student.balance || 0) * (student.hourly_rate || 0);
  const isLowBalance = Number(student.balance) < 3;
  const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${student.name}&backgroundColor=e5e7eb,d1d5db,9ca3af`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      <div className="hidden md:block"><Navbar /></div>

      <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/students">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">学员档案</h1>
            <p className="text-xs text-slate-400 font-medium">Student Profile & History</p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative mb-6">
          <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-100 relative">
             <div className="absolute top-4 right-4"><EditStudentButton student={student} /></div>
          </div>
          <div className="px-6 pb-8 relative">
            <div className="absolute -top-10 left-6 h-20 w-20 rounded-full border-4 border-white shadow-md bg-white overflow-hidden">
              <img src={avatarUrl} alt={student.name} className="h-full w-full object-cover" />
            </div>
            <div className="pt-12 mb-6">
               <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-black text-slate-900">{student.name}</h2>
                 {student.student_code && <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-mono text-xs border-slate-200">{student.student_code}</Badge>}
               </div>
               <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                 <span className="inline-block h-2 w-2 rounded-full bg-slate-300"></span>{student.level || "年级未知"}
               </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className={`p-4 rounded-2xl border ${isLowBalance ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`h-4 w-4 ${isLowBalance ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLowBalance ? 'text-rose-400' : 'text-emerald-400'}`}>剩余课时</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isLowBalance ? 'text-rose-600' : 'text-emerald-600'}`}>{Number(student.balance)}</span>
                    <span className={`text-sm font-bold ${isLowBalance ? 'text-rose-400' : 'text-emerald-500'}`}>hrs</span>
                  </div>
               </div>
               <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Wallet className="h-4 w-4 text-indigo-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">当前费率</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-indigo-600">${student.hourly_rate}</span>
                    <span className="text-sm font-bold text-indigo-400">/hr</span>
                  </div>
               </div>
            </div>

            <div className="mt-4"><TopUpButton studentId={student.id} /></div>
          </div>
        </div>

        {/* ✅ History Tabs */}
        <Tabs defaultValue="classes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-200/50 p-1 mb-4 h-12">
            <TabsTrigger value="classes" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              📚 上课记录 ({bookings?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              💰 资金流水 ({transactions?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* 上课记录 Tab */}
          <TabsContent value="classes" className="space-y-3">
            {!bookings?.length ? (
              <div className="text-center py-10 text-slate-400 text-xs">暂无上课记录</div>
            ) : (
              bookings.map((b: any) => (
                <Card key={b.id} className="p-4 flex items-center justify-between shadow-sm border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${b.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                      {b.status === 'completed' ? <CheckCircle2 className="h-5 w-5"/> : <CalendarIcon className="h-5 w-5"/>}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {format(new Date(b.start_time), "MMM d, HH:mm")}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" /> {b.location || "线上"} · {b.duration}h
                      </div>
                    </div>
                  </div>
                  <Badge variant={b.status === 'completed' ? 'secondary' : 'default'} className={b.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600'}>
                    {b.status === 'completed' ? '已消课' : b.status}
                  </Badge>
                </Card>
              ))
            )}
          </TabsContent>

          {/* 资金流水 Tab */}
          <TabsContent value="transactions" className="space-y-3">
            {!transactions?.length ? (
              <div className="text-center py-10 text-slate-400 text-xs">暂无资金记录</div>
            ) : (
              transactions.map((t: any) => (
                <Card key={t.id} className="p-4 flex items-center justify-between shadow-sm border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'income' ? <ArrowDownRight className="h-5 w-5"/> : <ArrowUpRight className="h-5 w-5"/>}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-900">{t.category}</div>
                      <div className="text-xs text-slate-400 mt-0.5 max-w-[200px] truncate">
                        {format(new Date(t.transaction_date), "MMM d")} · {t.description}
                      </div>
                    </div>
                  </div>
                  <div className={`text-sm font-black font-mono ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                    {t.type === 'income' ? '+' : '-'}${t.amount}
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>

      </main>

      {/* Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/60 pb-safe pt-1 px-6 z-50">
        <div className="flex justify-between items-center">
          <TabItem href="/" icon={HomeIcon} label="首页" isActive={false} />
          <TabItem href="/students" icon={Users} label="学生" isActive={true} />
          <Link href="/finance/add" className="active:scale-90 transition-transform -mt-8">
             <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-400/50 border-4 border-slate-50"><PenLine className="h-6 w-6" /></div>
          </Link>
          <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={false} />
          <TabItem href="/finance" icon={FileBarChart} label="报表" isActive={false} />
        </div>
      </div>
    </div>
  );
}