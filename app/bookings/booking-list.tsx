"use client";

import { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { completeBooking, cancelBooking, deleteBooking, updateBooking } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MapPin, Loader2, Trash2, Pencil, Check, 
  Calendar as CalendarIcon, BookOpen
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
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editDuration, setEditDuration] = useState("1");
  const [editLocation, setEditLocation] = useState("");

  const filteredByBusiness = bookings.filter((b) => {
    if (currentBusinessId === "tangent") return true;
    return b.business_unit_id === currentBusinessId;
  });

  const upcomingBookings = filteredByBusiness
    .filter(b => b.status === 'confirmed')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const historyBookings = filteredByBusiness
    .filter(b => b.status !== 'confirmed')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const displayList = activeTab === 'upcoming' ? upcomingBookings : historyBookings;

  const groupedBookings: Record<string, Booking[]> = {};
  displayList.forEach(b => {
    const dateKey = format(new Date(b.start_time), 'yyyy-MM-dd');
    if (!groupedBookings[dateKey]) groupedBookings[dateKey] = [];
    groupedBookings[dateKey].push(b);
  });

  const handleComplete = async (b: Booking) => {
    if (!confirm(`确认完成 ${b.student?.name} 的课程？`)) return;
    setLoadingId(b.id);
    if (b.student?.id) await completeBooking(b.id, b.student.id, b.duration);
    setLoadingId(null);
  };
  const handleCancel = async (id: string) => {
    if (!confirm("确定取消这个预约吗？")) return;
    setLoadingId(id); await cancelBooking(id); setLoadingId(null);
  };
  const handleDelete = async (id: string) => {
    if (!confirm("彻底删除记录？")) return;
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
    await updateBooking(editingBooking.id, {
      startTime: localDateTime.toISOString(),
      duration: Number(editDuration),
      location: editLocation
    });
    setEditingBooking(null);
    setLoadingId(null);
  };

  // ✅ 核心修改：使用 DiceBear 头像
  const Avatar = ({ name }: { name: string }) => {
    const avatarUrl = `https://api.dicebear.com/9.x/notionists/svg?seed=${name}&backgroundColor=e5e7eb,d1d5db,9ca3af`;
    return (
      <div className="h-10 w-10 rounded-full border border-slate-200 shadow-sm bg-white overflow-hidden flex-shrink-0">
        <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      <div className="bg-slate-100 p-1 rounded-xl flex items-center relative">
        <button 
          onClick={() => setActiveTab('upcoming')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'upcoming' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          待办 ({upcomingBookings.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          历史 ({historyBookings.length})
        </button>
      </div>

      {Object.keys(groupedBookings).length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-4">
            <CalendarIcon className="h-8 w-8" />
          </div>
          <p className="text-slate-400 text-sm font-medium">
            {activeTab === 'upcoming' ? '暂无待办课程，去排一节吧！' : '暂无历史记录'}
          </p>
        </div>
      ) : (
        Object.entries(groupedBookings).map(([dateKey, items]) => {
          const date = new Date(dateKey);
          const isDateToday = isToday(date);
          const isDateTomorrow = isTomorrow(date);
          
          let dateLabel = format(date, "M月d日 EEEE", { locale: zhCN });
          if (isDateToday) dateLabel = "今天 (Today)";
          if (isDateTomorrow) dateLabel = "明天 (Tomorrow)";

          return (
            <div key={dateKey} className="relative">
              <div className="sticky top-0 z-10 bg-slate-50 py-3 flex items-center gap-3">
                 <h3 className={`text-sm font-bold ${isDateToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                   {dateLabel}
                 </h3>
                 <div className="h-px flex-1 bg-slate-200"></div>
              </div>

              <div className="space-y-3 pl-2">
                {items.map(b => {
                   const startTime = new Date(b.start_time);
                   const isOverdue = activeTab === 'upcoming' && isPast(startTime) && !isToday(startTime);
                   
                   return (
                     <div key={b.id} className="relative pl-4 border-l-2 border-slate-200 hover:border-indigo-300 transition-colors py-1 group">
                        <div className={`absolute -left-[5px] top-4 h-2.5 w-2.5 rounded-full border-2 border-slate-50 ${isOverdue ? 'bg-rose-500' : b.status === 'completed' ? 'bg-slate-300' : 'bg-indigo-500'}`}></div>
                        
                        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm active:scale-[0.99] transition-transform">
                           <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-3">
                                 {/* ✅ 这里使用了新的 Avatar */}
                                 <Avatar name={b.student?.name || "?"} />
                                 <div>
                                    <h4 className="font-bold text-slate-900 text-sm">{b.student?.name}</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                      <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {b.student?.subject || "无科目"}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="text-right">
                                 <div className={`text-sm font-bold font-mono ${isOverdue ? 'text-rose-500' : 'text-slate-700'}`}>
                                   {format(startTime, "HH:mm")}
                                 </div>
                                 <div className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                   {b.duration}h
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                              <div className="flex items-center gap-1 text-xs text-slate-400">
                                <MapPin className="h-3 w-3" /> {b.location || "线上"}
                              </div>

                              <div className="flex items-center gap-2">
                                {activeTab === 'upcoming' ? (
                                  <>
                                    <button onClick={() => openEdit(b)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors">
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button onClick={() => handleComplete(b)} disabled={!!loadingId} className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors">
                                      {loadingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                      <span>完成</span>
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-2">
                                     <Badge variant="secondary" className="text-[10px] font-normal text-slate-400 bg-slate-50">
                                       {b.status === 'completed' ? '已完成' : '已取消'}
                                     </Badge>
                                     <button onClick={() => handleDelete(b.id)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors">
                                       <Trash2 className="h-4 w-4" />
                                     </button>
                                  </div>
                                )}
                              </div>
                           </div>
                        </div>
                     </div>
                   );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader><DialogTitle>编辑课程</DialogTitle></DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs text-slate-500">日期</Label>
              <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="col-span-3 h-9" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs text-slate-500">时间</Label>
              <Input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="col-span-3 h-9" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs text-slate-500">时长</Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input type="number" step="0.5" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="h-9" />
                <span className="text-xs text-slate-400">小时</span>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs text-slate-500">地点</Label>
              <Input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="col-span-3 h-9" />
            </div>
            <div className="flex justify-center pt-2">
               <button onClick={() => { if(editingBooking) handleCancel(editingBooking.id); setEditingBooking(null); }} className="text-xs text-rose-500 hover:underline">
                 取消该预约
               </button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={saveEdit} className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold">保存修改</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}