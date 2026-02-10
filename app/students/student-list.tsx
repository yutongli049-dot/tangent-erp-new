"use client";

import { useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { deleteStudent, updateStudent, topUpStudent } from "./actions"; 
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Trash2, Loader2, User, BookOpen, Pencil, 
  Search, Coins, MoreHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function StudentList({ students }: { students: any[] }) {
  const { currentBusinessId } = useBusiness();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // 编辑状态
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // 充值状态
  const [topUpTarget, setTopUpTarget] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState("10");

  const filteredStudents = students.filter(s => {
    const matchBusiness = currentBusinessId === "tangent" || s.business_unit_id === currentBusinessId;
    if (!matchBusiness) return false;
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(lowerTerm) || 
      (s.student_code && s.student_code.toLowerCase().includes(lowerTerm))
    );
  });

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该学员吗？这将同时删除其历史记录。")) return;
    setLoadingId(id);
    await deleteStudent(id);
    setLoadingId(null);
    toast.success("学员已删除");
  };

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

  const handleTopUp = async () => {
    if (!topUpTarget) return;
    setLoadingId(topUpTarget.id);
    const amount = Number(topUpAmount);
    const res = await topUpStudent(topUpTarget.id, amount);
    setLoadingId(null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(`充值成功！当前余额: ${Number(topUpTarget.balance) + amount}`);
      setTopUpTarget(null);
    }
  };

  // ✅ 核心修改：使用 DiceBear 头像
  const Avatar = ({ name }: { name: string }) => {
    // 使用名字作为种子，保证同一个人的头像永远不变
    // backgroundType=solid,gradient: 给头像加个底色，不那么单调
    const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${name}&backgroundColor=e5e7eb,d1d5db,9ca3af`;
    return (
      <div className="h-12 w-12 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100">
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input 
          placeholder="搜索姓名或学号..." 
          className="pl-9 h-11 rounded-xl bg-white border-slate-200 shadow-sm focus-visible:ring-indigo-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredStudents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
           <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-3">
             <User className="h-7 w-7"/>
           </div>
           <p className="text-slate-500 font-medium text-sm">暂无学员数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => {
            const isLowBalance = Number(student.balance) < 3;
            return (
              <div key={student.id} className="group relative">
                <Card className="h-full border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all overflow-hidden bg-white">
                  <Link href={`/students/${student.id}`} className="block p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <Avatar name={student.name} />
                        <div>
                          <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                             {student.student_code && (
                               <Badge variant="outline" className="text-[10px] h-4 px-1 rounded-sm border-slate-200 text-slate-400 font-mono">
                                 {student.student_code}
                               </Badge>
                             )}
                             <span className="text-xs text-slate-500">{student.level}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className={`text-right px-2.5 py-1 rounded-lg ${isLowBalance ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                         <div className={`text-lg font-black leading-none ${isLowBalance ? 'text-rose-600' : 'text-emerald-600'}`}>
                           {Number(student.balance)}
                         </div>
                         <div className={`text-[9px] font-bold uppercase mt-0.5 ${isLowBalance ? 'text-rose-400' : 'text-emerald-400'}`}>
                           剩余课时
                         </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-50 grid grid-cols-2 gap-2 text-xs text-slate-500">
                       <div className="flex items-center gap-1.5 truncate">
                         <BookOpen className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                         <span className="truncate">{student.subject || "无科目"}</span>
                       </div>
                       <div className="flex items-center gap-1.5 truncate">
                         <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                         <span className="truncate">{student.teacher || "无老师"}</span>
                       </div>
                    </div>
                  </Link>

                  <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
                     <span className="text-[10px] font-medium text-slate-400">
                       ${student.hourly_rate}/hr
                     </span>
                     <div className="flex items-center gap-1">
                        <Button 
                          size="sm" variant="ghost" 
                          className="h-7 px-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-1"
                          onClick={() => setTopUpTarget(student)}
                        >
                          <Coins className="h-3.5 w-3.5" /> 充值
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingStudent(student)}>
                              <Pencil className="mr-2 h-4 w-4" /> 编辑资料
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => handleDelete(student.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> 删除学员
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* 编辑弹窗 */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader><DialogTitle>编辑学员信息</DialogTitle></DialogHeader>
          {editingStudent && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs text-slate-500">姓名</Label>
                <Input value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className="col-span-3 h-9" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs text-slate-500">学号</Label>
                <Input value={editingStudent.student_code || ""} onChange={(e) => setEditingStudent({...editingStudent, student_code: e.target.value})} className="col-span-3 h-9" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs text-slate-500">科目</Label>
                <Input value={editingStudent.subject || ""} onChange={(e) => setEditingStudent({...editingStudent, subject: e.target.value})} className="col-span-3 h-9" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs text-slate-500">老师</Label>
                <Input value={editingStudent.teacher || ""} onChange={(e) => setEditingStudent({...editingStudent, teacher: e.target.value})} className="col-span-3 h-9" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right text-xs text-slate-500">费率</Label>
                <div className="col-span-3 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                  <Input type="number" value={editingStudent.hourly_rate} onChange={(e) => setEditingStudent({...editingStudent, hourly_rate: e.target.value})} className="pl-6 h-9" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={editLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl">{editLoading ? <Loader2 className="animate-spin" /> : "保存修改"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 充值弹窗 */}
      <Dialog open={!!topUpTarget} onOpenChange={(open) => !open && setTopUpTarget(null)}>
        <DialogContent className="sm:max-w-[325px] rounded-3xl">
          <DialogHeader className="text-center">
             <DialogTitle className="text-xl">课时充值</DialogTitle>
             <p className="text-xs text-slate-500">为 {topUpTarget?.name} 增加课时</p>
          </DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
             <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10" onClick={() => setTopUpAmount(String(Math.max(1, Number(topUpAmount) - 1)))}>-</Button>
                <div className="text-3xl font-black w-24 text-center tabular-nums">{topUpAmount}</div>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10" onClick={() => setTopUpAmount(String(Number(topUpAmount) + 1))}>+</Button>
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">HOURS</p>
             <div className="grid grid-cols-3 gap-2 w-full mt-2">
                {[5, 10, 20].map(amt => (
                  <button key={amt} onClick={() => setTopUpAmount(String(amt))} className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 py-2 rounded-xl text-xs font-bold transition-colors">
                    +{amt}
                  </button>
                ))}
             </div>
          </div>
          <DialogFooter>
            <Button onClick={handleTopUp} disabled={!!loadingId} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 text-base font-bold shadow-lg shadow-emerald-200">
              {loadingId ? <Loader2 className="animate-spin" /> : "确认充值"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}