"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { deleteStudent, updateStudent, topUpStudent } from "./actions"; 
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Trash2, Loader2, User, BookOpen, Pencil, 
  Search, Coins, MoreHorizontal, CalendarClock, ArchiveX, 
  ChevronDown, ChevronUp, GraduationCap, Filter, SortAsc, SortDesc
} from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export function StudentList({ students }: { students: any[] }) {
  const { currentBusinessId } = useBusiness();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // --- 筛选与排序状态 ---
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all");
  const [sortKey, setSortKey] = useState("student_code"); // student_code, name, balance
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [topUpTarget, setTopUpTarget] = useState<any>(null);
  const [topUpAmount, setTopUpAmount] = useState("10");
  const [showInactive, setShowInactive] = useState(false);

  // --- 动态提取筛选选项 ---
  const teachers = useMemo(() => {
    const set = new Set(students.map(s => s.teacher).filter(Boolean));
    return Array.from(set);
  }, [students]);

  const subjects = useMemo(() => {
    const set = new Set(students.map(s => s.subject).filter(Boolean));
    return Array.from(set);
  }, [students]);

  // --- 核心过滤与排序引擎 ---
  const { activeStudents, inactiveStudents } = useMemo(() => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    let list = students.filter(s => {
      // 1. 业务线过滤
      const matchBusiness = currentBusinessId === "tangent" || s.business_unit_id === currentBusinessId;
      if (!matchBusiness) return false;

      // 2. 搜索过滤
      const lowerTerm = searchTerm.toLowerCase();
      const matchSearch = !searchTerm || s.name.toLowerCase().includes(lowerTerm) || (s.student_code && s.student_code.toLowerCase().includes(lowerTerm));
      if (!matchSearch) return false;

      // 3. 老师过滤
      if (filterTeacher !== "all" && s.teacher !== filterTeacher) return false;

      // 4. 学科过滤
      if (filterSubject !== "all" && s.subject !== filterSubject) return false;

      return true;
    });

    // 5. 执行排序
    list.sort((a, b) => {
      let valA = a[sortKey] || "";
      let valB = b[sortKey] || "";

      // 数字处理 (余额/学号数字部分)
      if (sortKey === 'balance') {
        return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      }

      // 字符串处理
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      if (sortOrder === 'asc') return strA.localeCompare(strB);
      return strB.localeCompare(strA);
    });

    const active: any[] = [];
    const inactive: any[] = [];

    list.forEach(student => {
      let isActive = false;
      if (Number(student.balance) > 0) isActive = true;
      else if (new Date(student.created_at) > fourteenDaysAgo) isActive = true;
      else if (student.bookings?.some((b: any) => b.start_time && new Date(b.start_time) > fourteenDaysAgo)) isActive = true;
      
      if (searchTerm || filterTeacher !== "all" || filterSubject !== "all") isActive = true;

      if (isActive) active.push(student);
      else inactive.push(student);
    });

    return { activeStudents: active, inactiveStudents: inactive };
  }, [students, currentBusinessId, searchTerm, filterTeacher, filterSubject, sortKey, sortOrder]);

  // (API调用逻辑保持不变: handleDelete, handleSaveEdit, handleTopUp, Avatar...)
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
    if (res?.error) toast.error("更新失败: " + res.error);
    else { toast.success("学员信息已更新"); setEditingStudent(null); }
  };

  const handleTopUp = async () => {
    if (!topUpTarget) return;
    setLoadingId(topUpTarget.id);
    const amount = Number(topUpAmount);
    const res = await topUpStudent(topUpTarget.id, amount);
    setLoadingId(null);
    if (res?.error) toast.error(res.error);
    else {
      toast.success(`充值成功！当前余额: ${Number(topUpTarget.balance) + amount}`);
      setTopUpTarget(null);
    }
  };

  const Avatar = ({ name }: { name: string }) => {
    const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${name}&backgroundColor=e5e7eb,d1d5db,9ca3af`;
    return (
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full border border-slate-100 shadow-sm overflow-hidden bg-slate-100 shrink-0">
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  };

  const renderStudentRows = (list: any[]) => {
    return list.map((student) => {
      const totalBalance = Number(student.balance);
      const bookings = student.bookings || [];
      const scheduledHours = bookings
        .filter((b: any) => b.status === 'confirmed')
        .reduce((sum: number, b: any) => sum + Number(b.duration), 0);
      const unscheduledHours = Number((totalBalance - scheduledHours).toFixed(1));

      return (
        <div key={student.id} className="group flex flex-col md:flex-row md:items-center justify-between bg-white border border-slate-200 rounded-2xl p-4 hover:border-indigo-300 hover:shadow-md transition-all gap-4">
          <Link href={`/students/${student.id}`} className="flex items-center gap-4 flex-1 min-w-0">
            <Avatar name={student.name} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-base truncate">{student.name}</h3>
                {student.student_code && <Badge variant="outline" className="text-[10px] h-4 px-1.5 rounded-sm border-slate-200 text-slate-500 font-mono">{student.student_code}</Badge>}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 truncate">
                 <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-slate-400"/> {student.level || "-"}</span>
                 <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5 text-slate-400"/> {student.subject || "-"}</span>
                 <span className="flex items-center gap-1"><User className="h-3.5 w-3.5 text-slate-400"/> {student.teacher || "-"}</span>
              </div>
            </div>
          </Link>
          <div className="flex items-center justify-between md:justify-end gap-6 border-t border-slate-100 md:border-t-0 pt-3 md:pt-0">
             <Link href={`/students/${student.id}`} className="flex items-center gap-4">
                <div className="flex flex-col items-end"><span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">总课时</span><span className={`text-base font-black ${totalBalance < 3 ? 'text-slate-400' : 'text-slate-700'}`}>{totalBalance}<span className="text-[10px] font-bold ml-0.5">h</span></span></div>
                <div className="h-8 w-px bg-slate-200"></div>
                <div className="flex flex-col items-end w-16">
                   <span className={`text-[10px] font-bold uppercase tracking-wider ${unscheduledHours < 0 ? 'text-rose-400' : unscheduledHours > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>{unscheduledHours < 0 ? '欠费/超排' : '待排'}</span>
                   <div className={`text-base font-black flex items-center gap-1 ${unscheduledHours < 0 ? 'text-rose-600' : unscheduledHours > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{unscheduledHours}<span className="text-[10px] font-bold">h</span>{unscheduledHours > 0 && <CalendarClock className="h-3.5 w-3.5 ml-0.5" />}</div>
                </div>
             </Link>
             <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-9 px-2.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1.5 rounded-lg" onClick={() => setTopUpTarget(student)}><Coins className="h-4 w-4" /> 充值</Button>
                <DropdownMenu><DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="h-9 w-9 rounded-lg text-slate-400 hover:text-slate-700"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem onClick={() => setEditingStudent(student)}><Pencil className="mr-2 h-4 w-4" /> 编辑资料</DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => handleDelete(student.id)}><Trash2 className="mr-2 h-4 w-4" /> 删除学员</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
             </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* --- 顶栏：搜索、筛选与排序 --- */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="搜索姓名或学号..." className="pl-9 h-12 rounded-xl bg-white border-slate-200 shadow-sm text-base" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* 老师筛选 */}
          <Select value={filterTeacher} onValueChange={setFilterTeacher}>
            <SelectTrigger className="h-9 w-[120px] rounded-lg bg-white border-slate-200 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-slate-500"><User className="h-3.5 w-3.5"/> <SelectValue placeholder="老师" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有老师</SelectItem>
              {teachers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* 学科筛选 */}
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="h-9 w-[120px] rounded-lg bg-white border-slate-200 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-slate-500"><BookOpen className="h-3.5 w-3.5"/> <SelectValue placeholder="学科" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有学科</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* 排序字段 */}
          <Select value={sortKey} onValueChange={setSortKey}>
            <SelectTrigger className="h-9 w-[130px] rounded-lg bg-white border-slate-200 text-xs font-bold">
              <div className="flex items-center gap-1.5 text-indigo-600"><SortAsc className="h-3.5 w-3.5"/> <SelectValue placeholder="排序" /></div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student_code">按学员编号</SelectItem>
              <SelectItem value="name">按姓名 A-Z</SelectItem>
              <SelectItem value="balance">按剩余课时</SelectItem>
            </SelectContent>
          </Select>

          {/* 排序方向 */}
          <Button variant="ghost" size="icon" className="h-9 w-9 bg-white border border-slate-200 rounded-lg text-slate-500" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
             {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
          </Button>

          {/* 重置 */}
          {(filterTeacher !== "all" || filterSubject !== "all" || searchTerm) && (
            <Button variant="link" className="text-[10px] h-9 text-slate-400 font-bold" onClick={() => {setFilterTeacher("all"); setFilterSubject("all"); setSearchTerm("");}}>清除筛选</Button>
          )}
        </div>
      </div>

      {(activeStudents.length === 0 && inactiveStudents.length === 0) ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
           <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-3"><User className="h-7 w-7"/></div>
           <p className="text-slate-500 font-medium text-sm">未找到匹配的学员</p>
        </div>
      ) : (
        <div className="space-y-6">
           {activeStudents.length > 0 && <div className="flex flex-col gap-2">{renderStudentRows(activeStudents)}</div>}
           {inactiveStudents.length > 0 && (
             <div className="pt-2">
               <div className="flex items-center gap-4 mb-4">
                 <div className="h-px bg-slate-200 flex-1"></div>
                 <Button variant="outline" size="sm" className="rounded-full text-xs font-bold text-slate-500 gap-2 border-slate-200 bg-slate-50" onClick={() => setShowInactive(!showInactive)}>
                    <ArchiveX className="h-4 w-4" />{showInactive ? "收起沉睡名单" : `展开 ${inactiveStudents.length} 名沉睡学员`}
                    {showInactive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                 </Button>
                 <div className="h-px bg-slate-200 flex-1"></div>
               </div>
               {showInactive && <div className="flex flex-col gap-2 opacity-75 grayscale-[20%] transition-all animate-in fade-in slide-in-from-top-4">{renderStudentRows(inactiveStudents)}</div>}
             </div>
           )}
        </div>
      )}

      {/* 弹窗部分 (编辑/充值) 保持不变... */}
      <Dialog open={!!editingStudent} onOpenChange={(open) => !open && setEditingStudent(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader><DialogTitle>编辑学员信息</DialogTitle></DialogHeader>
          {editingStudent && (
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs text-slate-500">姓名</Label><Input value={editingStudent.name} onChange={(e) => setEditingStudent({...editingStudent, name: e.target.value})} className="col-span-3 h-9" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs text-slate-500">学号</Label><Input value={editingStudent.student_code || ""} onChange={(e) => setEditingStudent({...editingStudent, student_code: e.target.value})} className="col-span-3 h-9" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs text-slate-500">科目</Label><Input value={editingStudent.subject || ""} onChange={(e) => setEditingStudent({...editingStudent, subject: e.target.value})} className="col-span-3 h-9" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs text-slate-500">老师</Label><Input value={editingStudent.teacher || ""} onChange={(e) => setEditingStudent({...editingStudent, teacher: e.target.value})} className="col-span-3 h-9" /></div>
              <div className="grid grid-cols-4 items-center gap-4"><Label className="text-right text-xs text-slate-500">费率</Label><div className="col-span-3 relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span><Input type="number" value={editingStudent.hourly_rate} onChange={(e) => setEditingStudent({...editingStudent, hourly_rate: e.target.value})} className="pl-6 h-9" /></div></div>
            </div>
          )}
          <DialogFooter><Button onClick={handleSaveEdit} disabled={editLoading} className="w-full bg-indigo-600 rounded-xl">{editLoading ? <Loader2 className="animate-spin" /> : "保存修改"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!topUpTarget} onOpenChange={(open) => !open && setTopUpTarget(null)}>
        <DialogContent className="sm:max-w-[325px] rounded-3xl">
          <DialogHeader className="text-center"><DialogTitle className="text-xl">课时充值</DialogTitle><p className="text-xs text-slate-500">为 {topUpTarget?.name} 增加课时</p></DialogHeader>
          <div className="py-6 flex flex-col items-center gap-4">
             <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10" onClick={() => setTopUpAmount(String(Math.max(0.5, Number((Number(topUpAmount) - 0.5).toFixed(1)))))}>-</Button>
                <div className="text-3xl font-black w-24 text-center tabular-nums">{topUpAmount}</div>
                <Button variant="outline" size="icon" className="rounded-full h-10 w-10" onClick={() => setTopUpAmount(String(Number((Number(topUpAmount) + 0.5).toFixed(1))))}>+</Button>
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">HOURS</p>
             <div className="grid grid-cols-3 gap-2 w-full mt-2">
                {[5, 10, 20].map(amt => (<button key={amt} onClick={() => setTopUpAmount(String(amt))} className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 py-2 rounded-xl text-xs font-bold transition-colors">+{amt}</button>))}
             </div>
          </div>
          <DialogFooter><Button onClick={handleTopUp} disabled={!!loadingId} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-12 font-bold shadow-lg shadow-emerald-200">{loadingId ? <Loader2 className="animate-spin" /> : "确认充值"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}