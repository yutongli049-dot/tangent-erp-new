import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { BookingList } from "./booking-list";
import { Button } from "@/components/ui/button";
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import Link from "next/link";
import { MobileDock } from "@/components/MobileDock";

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

          <Link href="/bookings/quick" className="self-end sm:self-auto">
            <Button className="h-9 rounded-xl bg-indigo-600 px-3 text-xs font-bold shadow-lg shadow-indigo-200 transition-transform active:scale-95 hover:bg-indigo-700 sm:h-10 sm:w-auto sm:px-4 sm:text-sm">
              <Plus className="mr-1 h-4 w-4 sm:mr-2 sm:h-5 sm:w-5" />
              极速排课
            </Button>
          </Link>
        </div>

        <BookingList bookings={bookings || []} />

      </main>

      <MobileDock />
    </div>
  );
}