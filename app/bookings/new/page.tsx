import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form"; // 引入刚才写的组件
import { Navbar } from "@/components/Navbar";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

// ⚠️ 这是一个 Server Component (没有 'use client')
export default async function NewBookingPage() {
  const supabase = await createClient();

  // 从数据库拉取所有学员
  const { data: students } = await supabase
    .from("students")
    .select("id, name, level")
    .order("name");

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Link
            href="/"
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200/70 bg-white text-slate-500 shadow-sm transition-all hover:-translate-y-[1px] hover:text-indigo-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              新建预约
            </h1>
            <p className="text-xs font-medium text-slate-400">
              安排新的课程或服务
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          {/* 把拉取到的学员数据传给 Client Component */}
          <BookingForm students={students || []} />
        </div>
      </div>
    </main>
  );
}