import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { BookingList } from "./booking-list";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import Link from "next/link";

export default async function BookingsPage() {
  const supabase = await createClient();

  // ✅ 关键修改：select 中增加了 teacher 字段，用于排序
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students ( id, name, teacher )
    `)
    .order("start_time", { ascending: true }); // 默认按时间正序，前端分组后再排

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:text-indigo-600">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">排课表</h1>
              <p className="text-xs font-medium text-slate-400">Schedule & Timesheets</p>
            </div>
          </div>
          
          <Link href="/bookings/new">
            <Button className="rounded-xl bg-indigo-600 font-bold shadow-sm hover:bg-indigo-700 h-10 w-10 p-0">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>

        <BookingList bookings={bookings || []} />
      </div>
    </main>
  );
}