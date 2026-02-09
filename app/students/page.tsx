import { createClient } from "@/lib/supabase/server";
import { StudentList } from "./student-list"; 
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Users } from "lucide-react";

export default async function StudentsPage() {
  const supabase = await createClient();

  // 获取所有学员数据
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              学员管理 (Students)
            </h1>
            <p className="text-sm text-slate-500 mt-1">管理所有学员档案、课时余额及学习进度</p>
          </div>
          <Link href="/students/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm gap-2">
              <Plus className="h-4 w-4" /> 录入新学员
            </Button>
          </Link>
        </div>

        {/* ✅ 修复核心报错：属性名必须是 'students'，不能是 'initialStudents' */}
        <StudentList students={students || []} />
      </div>
    </main>
  );
}