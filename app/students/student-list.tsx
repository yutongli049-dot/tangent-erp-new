"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteStudent, updateStudent } from "./actions"; // 引入更新函数
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, ChevronRight, Trash2, Loader2, User, BookOpen, Wallet, Pencil } from "lucide-react";
import { toast } from "sonner";

export function StudentList({ students }: { students: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // 编辑状态
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // 删除逻辑
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); 
    if (!confirm("确定删除该学员吗？这将同时删除其历史记录。")) return;
    setLoadingId(id);
    await deleteStudent(id);
    setLoadingId(null);
    toast.success("学员已删除");
  };

  // 打开编辑弹窗
  const handleEditClick = (student: any, e: React.MouseEvent) => {
    e.preventDefault(); // 防止跳转到详情页
    setEditingStudent(student);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingStudent) return;
    setEditLoading(true);
    
    const res = await updateStudent(editingStudent.id, {
      name: editingStudent.name,
      studentCode: editingStudent.student_code,
      subject: editingStudent.subject,
      level: editingStudent.level,
      hourlyRate: editingStudent.hourly_rate,
      teacher: editingStudent.teacher,
    });

    setEditLoading(false);
    if (res?.error) {
      toast.error("更新失败: " + res.error);
    } else {
      toast.success("学员信息已更新");
      setEditingStudent(null);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map((student) => (
          <Link href={`/students/${student.id}`} key={student.id} className="group block">
            <Card className="h-full border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all relative overflow-hidden">
              <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg">
                      {student.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {student.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        {student.student_code || "无学号"}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">
                    {student.level || "Year 11"}
                  </Badge>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="truncate">{student.subject || "未设置"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <User className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="truncate">{student.teacher || "无老师"}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 text-slate-600 bg-slate-50 p-1.5 rounded">
                    <Wallet className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="font-medium">余额: <span className={Number(student.balance) < 3 ? "text-rose-600 font-bold" : "text-slate-900"}>{Number(student.balance)}</span> 课时</span>
                    <span className="text-xs text-slate-400">(${student.hourly_rate}/h)</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-end items-center gap-2">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    onClick={(e) => handleEditClick(student, e)}
                 >
                   <Pencil className="h-4 w-4" />
                 </Button>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={(e) => handleDelete(student.id, e)}
                    disabled={loadingId === student.id}
                 >
                   {loadingId === student.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                 </Button>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* 编辑弹窗 */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑学员信息</DialogTitle>
          </DialogHeader>
          {editingStudent && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">姓名</Label>
                <Input value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">学号</Label>
                <Input value={editingStudent.student_code || ""} onChange={(e) => setEditingStudent({...editingStudent, student_code: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">科目</Label>
                <Input value={editingStudent.subject || ""} onChange={(e) => setEditingStudent({...editingStudent, subject: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">年级</Label>
                <Select value={editingStudent.level} onValueChange={(val) => setEditingStudent({...editingStudent, level: val})}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Year 9">Year 9</SelectItem>
                    <SelectItem value="Year 10">Year 10</SelectItem>
                    <SelectItem value="Year 11">Year 11</SelectItem>
                    <SelectItem value="Year 12">Year 12</SelectItem>
                    <SelectItem value="Year 13">Year 13</SelectItem>
                    <SelectItem value="University">University</SelectItem>
                    <SelectItem value="Adult">Adult</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">老师</Label>
                <Input value={editingStudent.teacher || ""} onChange={(e) => setEditingStudent({...editingStudent, teacher: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">费率($)</Label>
                <Input type="number" value={editingStudent.hourly_rate} onChange={(e) => setEditingStudent({...editingStudent, hourly_rate: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? <Loader2 className="animate-spin" /> : "保存修改"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}