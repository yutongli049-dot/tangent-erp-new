"use client";

import { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { completeBooking, cancelBooking, deleteBooking, updateBooking } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, CheckCircle2, XCircle, Loader2, Trash2, GraduationCap, Pencil } from "lucide-react";
import { format } from "date-fns";

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  location: string | null;
  student: { id: string; name: string; teacher: string | null; } | null;
  business_unit_id: string;
};
type StudentGroup = { studentId: string; studentName: string; teacherName: string; bookings: Booking[]; };

export function BookingList({ bookings }: { bookings: Booking[] }) {
  const { currentBusinessId } = useBusiness();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // 编辑弹窗状态
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("1");
  const [editLocation, setEditLocation] = useState("");

  const filteredBookings = bookings.filter((b) => {
    if (currentBusinessId === "tangent") return true;
    return b.business_unit_id === currentBusinessId;
  });

  const rawPending = filteredBookings.filter(b => b.status === 'confirmed');
  const rawHistory = filteredBookings.filter(b => b.status !== 'confirmed');

  const groupAndSort = (list: Booking[]): StudentGroup[] => {
    const groups: Record<string, StudentGroup> = {};
    list.forEach(b => {
      const sId = b.student?.id || "unknown";
      if (!groups[sId]) groups[sId] = { studentId: sId, studentName: b.student?.name || "未知", teacherName: b.student?.teacher || "未分配", bookings: [] };
      groups[sId].bookings.push(b);
    });
    const groupArray = Object.values(groups);
    groupArray.sort((a, b) => {
      if (a.teacherName !== b.teacherName) return a.teacherName.localeCompare(b.teacherName, 'zh-CN');
      return a.studentName.localeCompare(b.studentName, 'zh-CN');
    });
    groupArray.forEach(g => g.bookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    return groupArray;
  };

  const groupedPending = groupAndSort(rawPending);
  const groupedHistory = groupAndSort(rawHistory);

  // --- 操作函数 ---
  const handleComplete = async (b: Booking) => {
    if (!confirm(`确认完成课程？`)) return;
    setLoadingId(b.id);
    if (b.student?.id) await completeBooking(b.id, b.student.id, b.duration);
    setLoadingId(null);
  };
  const handleCancel = async (id: string) => {
    if (!confirm("确定取消这个预约吗？")) return;
    setLoadingId(id); await cancelBooking(id); setLoadingId(null);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("彻底删除？")) return;
    setLoadingId(id); await deleteBooking(id); setLoadingId(null);
  };

  // ✅ 打开编辑弹窗
  const openEdit = (b: Booking) => {
    const d = new Date(b.start_time);
    setEditingBooking(b);
    // 这里 format 使用的是浏览器本地时间，所以 input 里显示的是 17:00 (正确)
    setEditDate(format(d, "yyyy-MM-dd"));
    setEditTime(format(d, "HH:mm"));
    setEditDuration(b.duration.toString());
    setEditLocation(b.location || "");
  };

  // ✅ 核心修复：保存编辑 (解决时区问题)
  const saveEdit = async () => {
    if (!editingBooking) return;
    setLoadingId(editingBooking.id);
    
    // 1. 在浏览器端构造本地时间对象
    // 例如：new Date("2026-02-01T17:00") -> 此时浏览器知道这是 NZDT
    const localDateTime = new Date(`${editDate}T${editTime}`);
    
    // 2. 转换为 ISO 字符串 (UTC)
    // .toISOString() 会自动把 17:00 NZDT 转成 04:00 UTC 并带上 'Z'
    const utcISOString = localDateTime.toISOString();

    await updateBooking(editingBooking.id, {
      startTime: utcISOString, // 发给后端的是准确的 UTC 时间
      duration: Number(editDuration),
      location: editLocation
    });
    
    setEditingBooking(null);
    setLoadingId(null);
  };

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  // Booking Card 组件 (保持不变，省略部分重复代码，核心逻辑在上面)
  const BookingCard = ({ booking, isActionable }: { booking: Booking, isActionable: boolean }) => {
    const overdue = isActionable && isOverdue(booking.start_time);
    return (
      <Card className={`flex flex-col gap-3 p-3 border-slate-200/60 shadow-sm transition-all ${overdue ? 'bg-amber-50/40 border-amber-200' : 'bg-white'}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge variant={booking.status === 'confirmed' ? (overdue ? 'destructive' : 'default') : booking.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
              {booking.status === 'confirmed' ? (overdue ? '逾期' : '待办') : booking.status === 'completed' ? '完成' : '取消'}
            </Badge>
            <span className="text-xs font-medium text-slate-500">{new Date(booking.start_time).toLocaleDateString()}</span>
          </div>
          {isActionable && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-indigo-600" onClick={() => openEdit(booking)}>
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-1">
            <Clock className={`h-3.5 w-3.5 ${overdue ? 'text-amber-600' : 'text-indigo-500'}`} />
            <span className="font-semibold">{new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <span className="text-slate-400">({booking.duration}h)</span>
          </div>
          {booking.location && (
            <div className="flex items-center gap-1 truncate max-w-[120px]">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {booking.location}
            </div>
          )}
        </div>
        
        {isActionable ? (
          <div className="mt-1 flex gap-2 pt-2 border-t border-slate-50">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-[10px]" onClick={() => handleComplete(booking)} disabled={loadingId === booking.id}>
              {loadingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "完成"}
            </Button>
            <Button variant="outline" className="flex-1 h-7 text-[10px] hover:bg-rose-50 hover:text-rose-600" onClick={() => handleCancel(booking.id)} disabled={loadingId === booking.id}>取消</Button>
          </div>
        ) : (
          <div className="mt-1 flex justify-end pt-2 border-t border-slate-50">
             <button onClick={() => handleDelete(booking.id)} disabled={loadingId === booking.id} className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors">
                {loadingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} 删除
             </button>
          </div>
        )}
      </Card>
    );
  };

  const StudentSection = ({ groups, title, isEmpty }: { groups: StudentGroup[], title: string, isEmpty: boolean }) => (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 sticky top-16 bg-slate-50 py-2 z-10 border-b border-slate-200/50">
        {title}
        {!isEmpty && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">{groups.reduce((acc, g) => acc + g.bookings.length, 0)}</span>}
      </h3>
      {isEmpty ? <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">暂无相关记录</div> : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.studentId} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">{group.studentName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{group.studentName}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500"><GraduationCap className="h-3 w-3" /> 老师: {group.teacherName}</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">{group.bookings.length} 节课</div>
              </div>
              <div className="p-3 grid grid-cols-1 gap-3">
                {group.bookings.map(b => <BookingCard key={b.id} booking={b} isActionable={b.status === 'confirmed'} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-10">
      <StudentSection title="📅 待处理课程 (Pending)" groups={groupedPending} isEmpty={groupedPending.length === 0} />
      <StudentSection title="🕒 归档记录 (History)" groups={groupedHistory} isEmpty={groupedHistory.length === 0} />

      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑课程</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">日期</Label>
              <Input id="date" type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="time" className="text-right">时间</Label>
              <Input id="time" type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duration" className="text-right">时长(h)</Label>
              <Input id="duration" type="number" step="0.5" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">地点</Label>
              <Input id="location" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} disabled={!!loadingId}>{loadingId ? <Loader2 className="animate-spin" /> : "保存修改"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}