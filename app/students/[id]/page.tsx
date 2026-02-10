import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, User, BookOpen, Wallet, Clock, 
  Home as HomeIcon, Users, Calendar as CalendarIcon, FileBarChart, PenLine
} from "lucide-react";
import TopUpButton from "./top-up-button"; 
import EditStudentButton from "./edit-button";

// 底部导航项
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

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  if (!student) {
    notFound();
  }

  const estimatedValue = (student.balance || 0) * (student.hourly_rate || 0);
  const isLowBalance = Number(student.balance) < 3;

  // ✅ 核心修改：生成头像 URL
  const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${student.name}&backgroundColor=e5e7eb,d1d5db,9ca3af`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      
      {/* 1. Desktop Navbar */}
      <div className="hidden md:block"><Navbar /></div>

      <main className="mx-auto max-w-2xl px-4 md:px-6 py-6 md:py-8">
        
        {/* 2. Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/students">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white border-slate-200 shadow-sm hover:bg-slate-50">
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">学员档案</h1>
            <p className="text-xs text-slate-400 font-medium">Student Profile</p>
          </div>
        </div>

        {/* 3. Main Profile Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden relative">
          
          {/* Top Banner */}
          <div className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 border-b border-slate-100 relative">
             <div className="absolute top-4 right-4">
                <EditStudentButton student={student} />
             </div>
          </div>

          <div className="px-6 pb-8 relative">
            {/* ✅ 头像区域：使用 img 标签 */}
            <div className="absolute -top-10 left-6 h-20 w-20 rounded-full border-4 border-white shadow-md bg-white overflow-hidden">
              <img src={avatarUrl} alt={student.name} className="h-full w-full object-cover" />
            </div>

            {/* Basic Info */}
            <div className="pt-12 mb-6">
               <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-black text-slate-900">{student.name}</h2>
                 {student.student_code && (
                   <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-mono text-xs px-1.5 py-0.5 border border-slate-200">
                     {student.student_code}
                   </Badge>
                 )}
               </div>
               <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                 <span className="inline-block h-2 w-2 rounded-full bg-slate-300"></span>
                 {student.level || "年级未知"}
               </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
               <div className={`p-4 rounded-2xl border ${isLowBalance ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className={`h-4 w-4 ${isLowBalance ? 'text-rose-500' : 'text-emerald-500'}`} />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isLowBalance ? 'text-rose-400' : 'text-emerald-400'}`}>
                      剩余课时
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-3xl font-black ${isLowBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {Number(student.balance)}
                    </span>
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

            {/* Details */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-4 border border-slate-100">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">学习科目 (Subject)</p>
                      <p className="text-sm font-bold text-slate-700">{student.subject || "未设置"}</p>
                    </div>
                  </div>
               </div>
               
               <div className="h-px w-full bg-slate-200/60"></div>

               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-slate-400 shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">负责老师 (Teacher)</p>
                      <p className="text-sm font-bold text-slate-700">{student.teacher || "未分配"}</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* Action */}
            <div className="mt-8">
               <TopUpButton studentId={student.id} />
               <p className="text-center text-xs text-slate-400 mt-3">
                 预计剩余价值: <span className="font-mono font-bold">${estimatedValue.toLocaleString()}</span>
               </p>
            </div>

          </div>
        </div>

      </main>

      {/* Mobile Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/60 pb-safe pt-1 px-6 z-50">
        <div className="flex justify-between items-center">
          <TabItem href="/" icon={HomeIcon} label="首页" isActive={false} />
          <TabItem href="/students" icon={Users} label="学生" isActive={true} />
          <Link href="/finance/add" className="active:scale-90 transition-transform -mt-8">
             <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-400/50 border-4 border-slate-50">
               <PenLine className="h-6 w-6" />
             </div>
          </Link>
          <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={false} />
          <TabItem href="/finance" icon={FileBarChart} label="报表" isActive={false} />
        </div>
      </div>
    </div>
  );
}