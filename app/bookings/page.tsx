import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { BookingList } from "./booking-list";
import { Button } from "@/components/ui/button";
import { Plus, Home as HomeIcon, Users, Calendar as CalendarIcon, FileBarChart, PenLine } from "lucide-react";
import Link from "next/link";

// 底部导航项 (复制自 Finance Page 以保持一致性)
const TabItem = ({ href, icon: Icon, label, isActive }: any) => (
  <Link href={href} className={`flex flex-col items-center justify-center gap-1 flex-1 active:scale-95 transition-transform py-2 group ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
    <div className={`h-6 w-6 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
      <Icon className="h-full w-full" />
    </div>
    <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{label}</span>
  </Link>
);

export default async function BookingsPage() {
  const supabase = await createClient();

  // 获取数据 (保留了 teacher 字段)
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students ( id, name, teacher, subject )
    `)
    .order("start_time", { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      
      {/* 1. Desktop Navbar */}
      <div className="hidden md:block"><Navbar /></div>

      <main className="mx-auto max-w-3xl px-4 md:px-6 py-6 md:py-8">
        
        {/* 2. Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 text-indigo-600" />
              课程管理 (Schedule)
            </h1>
            <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider pl-8">
              Manage Bookings & Timesheets
            </p>
          </div>
          
          <Link href="/bookings/new">
            <Button className="rounded-xl bg-indigo-600 font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 h-10 w-10 p-0 active:scale-95 transition-transform">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* 3. The List */}
        <BookingList bookings={bookings || []} />

      </main>

      {/* 4. Mobile Bottom Dock */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/60 pb-safe pt-1 px-6 z-50">
        <div className="flex justify-between items-center">
          <TabItem href="/" icon={HomeIcon} label="首页" isActive={false} />
          <TabItem href="/students" icon={Users} label="学生" isActive={false} />
          <Link href="/finance/add" className="active:scale-90 transition-transform -mt-8">
             <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-400/50 border-4 border-slate-50">
               <PenLine className="h-6 w-6" />
             </div>
          </Link>
          <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={true} />
          <TabItem href="/finance" icon={FileBarChart} label="报表" isActive={false} />
        </div>
      </div>
    </div>
  );
}