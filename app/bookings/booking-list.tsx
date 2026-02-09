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
  ChevronDown, ChevronRight, Calendar, User, BookOpen 
} from "lucide-react";
import { format, isToday, isTomorrow, isPast } from "date-fns";
import { zhCN } from "date-fns/locale";

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
  const [showHistory, setShowHistory] = useState(false); // ✅ 控制历史记录折叠

  // 编辑弹窗状态
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("1");
  const [editLocation, setEditLocation] = useState("");

  // 1. 筛选当前业务线数据
  const filteredBookings = bookings.filter((b) => {
    if (currentBusinessId === "tangent") return true;
    return b.business_unit_id === currentBusinessId;
  });

  // 2. 分类：待办 vs 历史
  const pendingBookings = filteredBookings
    .filter(b => b.status === 'confirmed')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()); // 按时间正序

  const historyBookings = filteredBookings
    .filter(b => b.status !== 'confirmed')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()); // 按时间倒序

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

  // --- 辅助组件：时间格式化 ---
  const FormatDate = ({ dateStr }: { dateStr: string }) => {
    const date = new Date(dateStr);
    let label = format(date, "M月d日 (EEE)", { locale: zhCN });
    if (isToday(date)) label = "今天 Today";
    if (isTomorrow(date)) label = "明天 Tomorrow";
    
    const isOverdue = isPast(date) && !isToday(date);

    return (
      <div className="flex flex-col">
        <span className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>{label}</span>
        <span className="text-xs text-slate-400">{format(date, "yyyy-MM-dd")}</span>
      </div>
    );
  };

  // --- 视图 1: 桌面端表格 (Desktop Table) ---
  const DesktopTable = ({ data, isHistory = false }: { data: Booking[], isHistory?: boolean }) => (
    <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-500 font-medium">
          <tr>
            <th className="px-6 py-3">日期 (Date)</th>
            <th className="px-6 py-3">时间 (Time)</th>
            <th className="px-6 py-3">学员 (Student)</th>
            <th className="px-6 py-3">地点 (Location)</th>
            <th className="px-6 py-3">状态 (Status)</th>
            <th className="px-6 py-3 text-right">操作 (Actions)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((b) => {
            const isOverdue = new Date(b.start_time) < new Date() && b.status === 'confirmed';
            return (
              <tr key={b.id} className={`hover:bg-slate-50/80 transition-colors ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                <td className="px-6 py-4 whitespace-nowrap"><FormatDate dateStr={b.start_time} /></td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1 font-bold text-indigo-900">
                    <Clock className="h-4 w-4 text-indigo-400" />
                    {format(new Date(b.start_time), "HH:mm")}
                    <span className="text-xs text-slate-400 font-normal ml-1">({b.duration}h)</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-900">{b.student?.name}</div>
                  <div className="text-xs text-slate-500">{b.student?.subject || "-"}</div>
                </td>
                <td className="px-6 py-4 text-slate-500 truncate max-w-[150px]">{b.location || "线上"}</td>
                <td className="px-6 py-4">
                  {b.status === 'confirmed' ? (
                     isOverdue ? <Badge variant="destructive">已逾期</Badge> : <Badge variant="outline" className="text-indigo-600 bg-indigo-50 border-indigo-200">待进行</Badge>
                  ) : b.status === 'completed' ? (
                    <Badge variant="default" className="bg-emerald-500">已完成</Badge>
                  ) : (
                    <Badge variant="secondary">已取消</Badge>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* 操作按钮组 */}
                    {b.status === 'confirmed' ? (
                      <>
                        <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleComplete(b)} disabled={!!loadingId}>
                           {loadingId === b.id ? <Loader2 className="h-3 w-3 animate-spin"/> : <CheckCircle2 className="h-4 w-4" />}
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 hover:bg-indigo-50" onClick={() => openEdit(b)}>
                          <Pencil className="h-3.5 w-3.5 text-slate-500" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 hover:bg-rose-50 text-rose-600 border-rose-100" onClick={() => handleCancel(b.id)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDelete(b.id)}>
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

  // --- 视图 2: 移动端卡片 (Mobile Cards) ---
  const MobileCards = ({ data }: { data: Booking[] }) => (
    <div className="md:hidden space-y-3">
      {data.map((b) => {
         const isOverdue = new Date(b.start_time) < new Date() && b.status === 'confirmed';
         return (
          <Card key={b.id} className={`p-4 border-l-4 ${isOverdue ? 'border-l-rose-500' : b.status === 'completed' ? 'border-l-emerald-500' : 'border-l-indigo-500'} shadow-sm`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-bold text-slate-900 text-base">{b.student?.name}</div>
                <div className="text-xs text-slate-500 flex items-center gap-1"><BookOpen className="h-3 w-3"/> {b.student?.subject || "未填科目"}</div>
              </div>
              <div className="text-right">
                 <div className={`text-lg font-bold ${isOverdue ? 'text-rose-600' : 'text-indigo-600'}`}>{format(new Date(b.start_time), "HH:mm")}</div>
                 <div className="text-xs text-slate-400">{format(new Date(b.start_time), "MM-dd")} ({b.duration}h)</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 bg-slate-50 p-2 rounded">
              <MapPin className="h-3 w-3" /> {b.location || "线上"}
            </div>

            <div className="flex gap-2">
              {b.status === 'confirmed' ? (
                <>
                  <Button className="flex-1 h-9 bg-emerald-600 text-xs" onClick={() => handleComplete(b)}>完成</Button>
                  <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => openEdit(b)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-rose-200" onClick={() => handleCancel(b.id)}><XCircle className="h-4 w-4 text-rose-500" /></Button>
                </>
              ) : (
                <div className="w-full flex justify-between items-center">
                   <Badge variant="secondary">{b.status === 'completed' ? '已完成' : '已取消'}</Badge>
                   <Button variant="ghost" size="sm" onClick={() => handleDelete(b.id)} className="text-rose-400"><Trash2 className="h-4 w-4" /></Button>
                </div>
              )}
            </div>
          </Card>
         );
      })}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* 1. 待处理课程区域 */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            待办课程 (Pending)
            <Badge className="bg-indigo-600 hover:bg-indigo-700">{pendingBookings.length}</Badge>
          </h2>
        </div>
        
        {pendingBookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
            <p className="text-slate-400">🎉 太棒了，所有课程都处理完了！</p>
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
          className="flex items-center gap-2 cursor-pointer group select-none"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className={`p-1 rounded-md transition-all ${showHistory ? 'bg-slate-200 rotate-90' : 'bg-slate-100'}`}>
            <ChevronRight className="h-4 w-4 text-slate-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-500 group-hover:text-slate-800 transition-colors">
            历史归档 (History) • {historyBookings.length}
          </h2>
          <div className="h-px flex-1 bg-slate-200 group-hover:bg-slate-300 transition-colors" />
        </div>

        {showHistory && (
          <div className="animate-in slide-in-from-top-2 duration-300">
             {/* 历史记录表格通常可以稍微淡一点，表示非重点 */}
             <div className="opacity-80 hover:opacity-100 transition-opacity">
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