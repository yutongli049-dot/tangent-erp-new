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
import { 
  Clock, MapPin, Loader2, Trash2, Pencil, CheckCircle2, XCircle, 
  ChevronRight, Calendar as CalendarIcon, MoreHorizontal, User
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, isSameYear } from "date-fns";
import { zhCN, enNZ } from "date-fns/locale";

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  location: string | null;
  student: { id: string; name: string; teacher: string | null; subject: string | null; } | null;
  business_unit_id: string;
};

export function BookingList({ bookings }: { bookings: Booking[] }) {
  const { currentBusinessId } = useBusiness();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

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

  const pendingBookings = filteredBookings
    .filter(b => b.status === 'confirmed')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const historyBookings = filteredBookings
    .filter(b => b.status !== 'confirmed')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  // --- 操作函数 (保持不变) ---
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
  const openEdit = (b: Booking) => {
    const d = new Date(b.start_time);
    setEditingBooking(b);
    setEditDate(format(d, "yyyy-MM-dd"));
    setEditTime(format(d, "HH:mm"));
    setEditDuration(b.duration.toString());
    setEditLocation(b.location || "");
  };
  const saveEdit = async () => {
    if (!editingBooking) return;
    setLoadingId(editingBooking.id);
    const localDateTime = new Date(`${editDate}T${editTime}`);
    const utcISOString = localDateTime.toISOString();
    await updateBooking(editingBooking.id, {
      startTime: utcISOString,
      duration: Number(editDuration),
      location: editLocation
    });
    setEditingBooking(null);
    setLoadingId(null);
  };

  // --- UI 组件：头像生成器 ---
  const Avatar = ({ name }: { name: string }) => {
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    // 随机底色逻辑 (基于首字母 charCode)
    const colors = [
      "bg-red-100 text-red-600", "bg-orange-100 text-orange-600", 
      "bg-amber-100 text-amber-600", "bg-emerald-100 text-emerald-600",
      "bg-cyan-100 text-cyan-600", "bg-blue-100 text-blue-600", 
      "bg-indigo-100 text-indigo-600", "bg-violet-100 text-violet-600"
    ];
    const colorClass = colors[name.charCodeAt(0) % colors.length];

    return (
      <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm ${colorClass}`}>
        {initial}
      </div>
    );
  };

  // --- UI 组件：日期块 ---
  const DateBlock = ({ dateStr }: { dateStr: string }) => {
    const date = new Date(dateStr);
    const isOverdue = isPast(date) && !isToday(date);
    
    return (
      <div className="flex items-center gap-3">
        <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border ${isOverdue ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
          <span className="text-[10px] font-bold uppercase tracking-wider">{format(date, "MMM")}</span>
          <span className="text-lg font-bold leading-none">{format(date, "d")}</span>
        </div>
        <div className="flex flex-col">
          <span className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
            {isToday(date) ? "今天 Today" : isTomorrow(date) ? "明天 Tomorrow" : format(date, "EEEE", { locale: enNZ })}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            {format(date, "yyyy")}
          </span>
        </div>
      </div>
    );
  };

  // --- 视图 1: 现代化桌面表格 ---
  const DesktopTable = ({ data, isHistory = false }: { data: Booking[], isHistory?: boolean }) => (
    <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white ring-1 ring-slate-950/5">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
          <tr>
            <th className="px-6 py-3 pl-8">Date & Time</th>
            <th className="px-6 py-3">Student</th>
            <th className="px-6 py-3">Location</th>
            <th className="px-6 py-3 text-center">Status</th>
            <th className="px-6 py-3 text-right pr-8">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((b) => {
            const isOverdue = new Date(b.start_time) < new Date() && b.status === 'confirmed';
            return (
              <tr key={b.id} className="group hover:bg-slate-50 transition-all duration-200">
                {/* 1. 日期与时间 */}
                <td className="px-6 py-3 pl-8">
                  <div className="flex items-center gap-4">
                    <DateBlock dateStr={b.start_time} />
                    <div className="h-8 w-px bg-slate-100 mx-2" /> 
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                           <Clock className="h-3.5 w-3.5 text-indigo-500" />
                           {format(new Date(b.start_time), "HH:mm")}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 rounded w-fit mt-0.5">
                           {b.duration} hrs
                        </span>
                    </div>
                  </div>
                </td>

                {/* 2. 学员 */}
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={b.student?.name || "U"} />
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{b.student?.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        {b.student?.subject || "无科目"}
                      </div>
                    </div>
                  </div>
                </td>

                {/* 3. 地点 */}
                <td className="px-6 py-3">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium max-w-[140px] truncate">
                     <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                     {b.location || "线上 Online"}
                  </div>
                </td>

                {/* 4. 状态 */}
                <td className="px-6 py-3 text-center">
                  {b.status === 'confirmed' ? (
                     isOverdue ? (
                       <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 shadow-none">逾期 Overdue</Badge>
                     ) : (
                       <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 shadow-none">待办 Pending</Badge>
                     )
                  ) : b.status === 'completed' ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 shadow-none">已完成 Done</Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-slate-100 text-slate-500">已取消</Badge>
                  )}
                </td>

                {/* 5. 悬停操作栏 (Hover Actions) */}
                <td className="px-6 py-3 pr-8 text-right">
                  <div className={`flex items-center justify-end gap-1 transition-opacity duration-200 ${isHistory ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                    {b.status === 'confirmed' ? (
                      <>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:bg-emerald-600 hover:text-white transition-colors rounded-full" onClick={() => handleComplete(b)} disabled={!!loadingId} title="完成课程">
                           {loadingId === b.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full" onClick={() => openEdit(b)} title="编辑">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full" onClick={() => handleCancel(b.id)} title="取消">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-rose-500 rounded-full" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // --- 视图 2: 移动端卡片 (Mobile Cards) - 保持不变但优化视觉 ---
  const MobileCards = ({ data }: { data: Booking[] }) => (
    <div className="md:hidden space-y-3">
      {data.map((b) => {
         const isOverdue = new Date(b.start_time) < new Date() && b.status === 'confirmed';
         return (
          <Card key={b.id} className="p-4 shadow-sm border-slate-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                 <Avatar name={b.student?.name || "U"} />
                 <div>
                    <div className="font-bold text-slate-900">{b.student?.name}</div>
                    <div className="text-xs text-slate-500">{b.student?.subject || "无科目"}</div>
                 </div>
              </div>
              <div className={`text-right ${isOverdue ? 'text-rose-600' : 'text-slate-900'}`}>
                 <div className="font-bold text-lg">{format(new Date(b.start_time), "HH:mm")}</div>
                 <div className="text-xs font-medium opacity-70">{format(new Date(b.start_time), "MM-dd")}</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg mb-4 border border-slate-100">
               <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                 <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                 {b.location || "线上"}
               </div>
               <div className="text-xs text-slate-400 font-medium">{b.duration} 小时</div>
            </div>

            <div className="flex gap-2">
              {b.status === 'confirmed' ? (
                <>
                  <Button className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 shadow-sm text-sm font-bold" onClick={() => handleComplete(b)}>完成课程</Button>
                  <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => openEdit(b)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                  <Button variant="outline" size="icon" className="h-10 w-10 border-rose-100 text-rose-500 bg-rose-50" onClick={() => handleCancel(b.id)}><XCircle className="h-4 w-4" /></Button>
                </>
              ) : (
                <div className="w-full flex justify-between items-center pl-1">
                   <Badge variant="secondary" className="bg-slate-100 text-slate-500">{b.status === 'completed' ? '已完成' : '已取消'}</Badge>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4 mr-1" /> 删除</Button>
                </div>
              )}
            </div>
          </Card>
         );
      })}
    </div>
  );

  return (
    <div className="space-y-10 pb-10">
      {/* 1. 待处理课程区域 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-600" />
            待办课程 (Pending)
            <Badge className="bg-indigo-600 hover:bg-indigo-700 shadow-sm ml-1 h-5 px-1.5">{pendingBookings.length}</Badge>
          </h2>
        </div>
        
        {pendingBookings.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-xl border border-dashed border-slate-200 shadow-sm">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-slate-900 font-bold mb-1">太棒了，暂无待办课程！</h3>
            <p className="text-slate-400 text-sm">Have a cup of coffee ☕</p>
          </div>
        ) : (
          <>
            <DesktopTable data={pendingBookings} />
            <MobileCards data={pendingBookings} />
          </>
        )}
      </section>

      {/* 2. 历史记录 (可折叠) */}
      <section className="space-y-4">
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none py-2"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className={`p-1.5 rounded-full transition-all duration-300 ${showHistory ? 'bg-indigo-100 text-indigo-600 rotate-90' : 'bg-slate-100 text-slate-500'}`}>
            <ChevronRight className="h-4 w-4" />
          </div>
          <h2 className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors">
            历史归档 (History) <span className="text-xs font-normal bg-slate-100 px-2 py-0.5 rounded-full ml-2 text-slate-400">{historyBookings.length}</span>
          </h2>
          <div className="h-px flex-1 bg-slate-100 group-hover:bg-slate-200 transition-colors" />
        </div>

        {showHistory && (
          <div className="animate-in slide-in-from-top-4 fade-in duration-300">
             <div className="opacity-75 hover:opacity-100 transition-opacity duration-300">
               <DesktopTable data={historyBookings} isHistory />
               <MobileCards data={historyBookings} />
             </div>
          </div>
        )}
      </section>

      {/* 编辑弹窗 (保持不变) */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑课程</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">日期</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">时间</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">时长(h)</Label>
              <Input type="number" step="0.5" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">地点</Label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="col-span-3" />
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