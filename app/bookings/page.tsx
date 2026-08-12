import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { BookingList } from "./booking-list";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon, Home as HomeIcon, Users, FileBarChart, PenLine } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

// 底部导航项
const TabItem = ({ href, icon: Icon, label, isActive }: { href: string; icon: LucideIcon; label: string; isActive: boolean }) => (
  <Link href={href} className={`flex flex-col items-center justify-center gap-1 flex-1 active:scale-95 transition-transform py-2 group ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
    <div className={`h-6 w-6 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
      <Icon className="h-full w-full" />
    </div>
    <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{label}</span>
  </Link>
);

export default async function BookingsPage() {
  const supabase = await createClient();

  // ✅ 核心修改：增加了 hourly_rate, student_code
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students ( id, name, teacher, subject, hourly_rate, student_code, currency )
    `)
    .order("start_time", { ascending: true });

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24 md:pb-10">
      
      <div className="hidden md:block"><Navbar /></div>

      <main className="mx-auto max-w-3xl px-4 md:px-6 py-5 md:py-8">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              <CalendarIcon className="h-6 w-6 text-indigo-600" />
              课程管理 (Schedule)
            </h1>
            <p className="mt-1 pl-8 text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:text-xs">
              Manage Bookings & Timesheets
            </p>
          </div>

          <Link href="/bookings/new" className="self-end sm:self-auto">
            <Button className="h-9 rounded-xl bg-indigo-600 px-3 text-xs font-bold shadow-lg shadow-indigo-200 transition-transform active:scale-95 hover:bg-indigo-700 sm:h-10 sm:w-auto sm:px-4 sm:text-sm">
              <Plus className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              极速排课
            </Button>
          </Link>
        </div>

        <BookingList bookings={bookings || []} />

      </main>

      {/* Mobile Dock */}
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