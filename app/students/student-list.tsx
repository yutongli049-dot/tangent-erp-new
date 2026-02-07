"use client";

import { useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { deleteStudent } from "./actions"; // ✅ 引入删除函数
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // ✅ 引入 Button
import { Phone, ChevronRight, Trash2, Loader2 } from "lucide-react"; // ✅ 引入图标

type Student = {
  id: string;
  name: string;
  level: string;
  phone: string | null;
  balance: number;
  business_unit_id: string;
};

export function StudentList({ initialStudents }: { initialStudents: Student[] }) {
  const { currentBusinessId } = useBusiness();
  const [deletingId, setDeletingId] = useState<string | null>(null); // ✅ 删除状态

  // 客户端过滤
  const filteredStudents = initialStudents.filter((student) => {
    if (currentBusinessId === "tangent") return true;
    return student.business_unit_id === currentBusinessId;
  });

  // ✅ 处理删除逻辑
  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault(); // 阻止 Link 跳转
    e.stopPropagation(); // 双重保险
    
    const confirmMsg = `⚠️ 确定要删除学员 "${name}" 吗？\n\n这将彻底删除他的：\n1. 所有历史预约记录\n2. 所有缴费/充值记录\n\n此操作【无法恢复】！`;
    
    if (!confirm(confirmMsg)) return;

    setDeletingId(id);
    await deleteStudent(id);
    setDeletingId(null);
  };

  if (filteredStudents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
        <p className="text-sm font-medium text-slate-500">暂无学员数据</p>
        <p className="mt-1 text-xs text-slate-400">点击右上角按钮添加第一个学员</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredStudents.map((student) => (
        <Link 
          key={student.id} 
          href={`/students/${student.id}`} 
          className="block transition-transform active:scale-[0.99]"
        >
          <Card className="group flex items-center justify-between overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:border-indigo-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]">
            
            {/* 左侧信息区域 */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                {student.name.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                    {student.name}
                  </h3>
                  <span className={`
                    inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset
                    ${student.level === 'Full' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 
                      student.level === 'Restricted' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' : 
                      'bg-slate-50 text-slate-600 ring-slate-500/10'}
                  `}>
                    {student.level}
                  </span>
                </div>
                
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {student.phone || "无电话"}
                  </span>
                </div>
              </div>
            </div>

            {/* 右侧数据与操作 */}
            <div className="flex items-center gap-3">
              <div className="text-right mr-2">
                <div className="text-sm font-bold text-slate-900">
                  {student.balance} <span className="text-[10px] font-normal text-slate-400">课时</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                disabled={deletingId === student.id}
                onClick={(e) => handleDelete(e, student.id, student.name)}
                className="h-8 w-8 text-slate-300 hover:bg-rose-50 hover:text-rose-600 z-10"
              >
                {deletingId === student.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>

              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}