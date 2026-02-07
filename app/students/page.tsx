import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/Navbar";
import { StudentList } from "../students/student-list"; // 引入下面的客户端组件
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default async function StudentsPage() {
  const supabase = await createClient();

  // 1. 服务端获取所有学员 (按创建时间倒序)
  const { data: students } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto max-w-xl px-6 py-8">
        {/* 顶部标题 + 添加按钮 */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              学员管理
            </h1>
            <p className="text-xs font-medium text-slate-400">
              所有在册学员档案
            </p>
          </div>
          
          <Link href="/students/new">
            <Button className="rounded-xl bg-indigo-600 font-bold shadow-sm hover:bg-indigo-700 active:scale-[0.98]">
              <Plus className="mr-1 h-4 w-4" />
              新学员
            </Button>
          </Link>
        </div>

        {/* 2. 传递给客户端组件进行渲染和过滤 */}
        <StudentList initialStudents={students || []} />
      </div>
    </main>
  );
}