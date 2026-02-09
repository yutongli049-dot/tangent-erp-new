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
  ChevronRight, Calendar as CalendarIcon, MoreHorizontal, User, AlertCircle
} from "lucide-react";
import { format, isToday, isTomorrow, isPast, addHours } from "date-fns";
import { enNZ } from "date-fns/locale";

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

  // 编辑弹窗
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

  // --- Actions ---
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

  // --- Avatar Component ---
  const Avatar = ({ name }: { name: string }) => {
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    const colors = [
      "bg-blue-100 text-blue-600", "bg-emerald-100 text-emerald-600",
      "bg-orange-100 text-orange-600", "bg-purple-100 text-purple-600",
      "bg-cyan-100 text-cyan-600", "bg-pink-100 text-pink-600"
    ];
    const colorClass = colors[name.charCodeAt(0) % colors.length];
    return (
      <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${colorClass}`}>
        {initial}
      </div>
    );
  };

  // --- Shared Grid Class (The Magic Sauce) ---
  // 12 Cols: Date(2) | Time(2) | Student(3) | Location(3) | Actions(2)
  const gridClass = "grid grid-cols-12 gap-4 items-center";

  // --- Desktop Row Item ---
  const DesktopRow = ({ b, isHistory }: { b: Booking, isHistory: boolean }) => {
    const date = new Date(b.start_time);
    const isOverdue = isPast(date) && !isToday(date) && b.status === 'confirmed';
    const endTime = addHours(date, b.duration);

    return (
      <div className={`${gridClass} px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors group ${isOverdue ? 'bg-rose-50/30' : ''}`}>
        
        {/* 1. Date (Col 2) */}
        <div className="col-span-2">
          <div className={`text-sm font-bold ${isOverdue ? 'text-rose-600' : isToday(date) ? 'text-indigo-600' : 'text-slate-700'}`}>
            {format(date, "MMM d")}
            {isToday(date) && <span className="ml-1.5 text-[10px] bg-indigo-100 text-indigo-600 px-1 rounded font-normal">Today</span>}
          </div>
          <div className="text-xs text-slate-400 font-medium">
            {format(date, "EEEE", { locale: enNZ })}
          </div>
        </div>

        {/* 2. Time (Col 2) */}
        <div className="col-span-2">
           <div className="text-sm font-medium text-slate-700 tabular-nums">
             {format(date, "HH:mm")} <span className="text-slate-300">-</span> {format(endTime, "HH:mm")}
           </div>
           <div className="text-[10px] text-slate-400 font-medium mt-0.5">
             {b.duration} hrs
           </div>
        </div>

        {/* 3. Student (Col 3) - Enhanced Spacing */}
        <div className="col-span-3 flex items-center gap-3 overflow-hidden">
          <Avatar name={b.student?.name || "?"} />
          <div className="min-w-0">
            <div className="text-sm font-bold text-slate-900 truncate">{b.student?.name}</div>
            <div className="text-xs text-slate-500 truncate" title={b.student?.subject || ""}>
              {b.student?.subject || "无科目"}
            </div>
          </div>
        </div>

        {/* 4. Location (Col 3) */}
        <div className="col-span-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 truncate" title={b.location || "线上"}>
             <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
             <span className="truncate">{b.location || "线上"}</span>
          </div>
        </div>

        {/* 5. Status & Actions (Col 2) */}
        <div className="col-span-2 flex items-center justify-end gap-1">
          {b.status === 'confirmed' ? (
             <>
               <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => openEdit(b)} title="编辑">
                 <Pencil className="h-4 w-4" />
               </Button>
               <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onClick={() => handleCancel(b.id)} title="取消">
                 <XCircle className="h-4 w-4" />
               </Button>
               <Button 
                 size="sm" 
                 className={`h-8 px-3 ml-1 text-xs font-bold shadow-sm ${isOverdue ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                 onClick={() => handleComplete(b)} disabled={!!loadingId}
               >
                 {loadingId === b.id ? <Loader2 className="h-3 w-3 animate-spin"/> : "完成"}
               </Button>
             </>
          ) : (
            <div className="flex items-center gap-2">
               <Badge variant="secondary" className="text-slate-400 font-normal bg-slate-100">{b.status === 'completed' ? 'Done' : 'Cancelled'}</Badge>
               <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDelete(b.id)}>
                 <Trash2 className="h-4 w-4" />
               </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Mobile Card Item ---
  const MobileCard = ({ b }: { b: Booking }) => {
    const date = new Date(b.start_time);
    const isOverdue = isPast(date) && !isToday(date) && b.status === 'confirmed';
    
    return (
      <Card className="p-4 border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
             <Avatar name={b.student?.name || "?"} />
             <div>
                <div className="font-bold text-slate-900">{b.student?.name}</div>
                <div className="text-xs text-slate-500">{b.student?.subject || "无科目"}</div>
             </div>
          </div>
          <div className="text-right">
             <div className={`font-bold text-lg leading-none ${isOverdue ? 'text-rose-600' : 'text-indigo-600'}`}>{format(date, "HH:mm")}</div>
             <div className="text-xs font-medium text-slate-400 mt-1">{format(date, "MMM d")}</div>
          </div>
        </div>
        
        <div className="bg-slate-50 rounded px-3 py-2 text-xs text-slate-600 flex items-center justify-between mb-4">
           <span className="flex items-center gap-1.5 truncate max-w-[70%]"><MapPin className="h-3 w-3 text-indigo-400" /> {b.location || "线上"}</span>
           <span>{b.duration} hrs</span>
        </div>

        {b.status === 'confirmed' ? (
          <div className="grid grid-cols-4 gap-2">
             <Button variant="outline" className="col-span-1 border-rose-100 text-rose-500 hover:bg-rose-50" onClick={() => handleCancel(b.id)}><XCircle className="h-4 w-4"/></Button>
             <Button variant="outline" className="col-span-1 hover:bg-slate-50" onClick={() => openEdit(b)}><Pencil className="h-4 w-4 text-slate-500"/></Button>
             <Button className={`col-span-2 font-bold ${isOverdue ? 'bg-rose-600' : 'bg-emerald-600'}`} onClick={() => handleComplete(b)}>完成课程</Button>
          </div>
        ) : (
          <div className="flex justify-between items-center">
             <Badge variant="outline" className="text-slate-500">{b.status === 'completed' ? '已完成' : '已取消'}</Badge>
             <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => handleDelete(b.id)}><Trash2 className="h-4 w-4"/></Button>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Pending List */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-indigo-600" />
            待办课程 (Pending)
            <Badge className="bg-indigo-600 h-5 px-1.5">{pendingBookings.length}</Badge>
          </h2>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
             <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3"><CheckCircle2 className="h-6 w-6"/></div>
             <p className="text-slate-500 font-medium">暂无待办课程</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
             {/* Desktop Headers - STRICT GRID ALIGNMENT */}
             <div className={`hidden md:grid ${gridClass} bg-slate-50 border-b border-slate-100 px-6 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider`}>
                <div className="col-span-2">Date</div>
                <div className="col-span-2">Time</div>
                <div className="col-span-3">Student</div>
                <div className="col-span-3">Location</div>
                <div className="col-span-2 text-right">Actions</div>
             </div>
             {/* Rows */}
             <div className="divide-y divide-slate-100">
                {pendingBookings.map(b => (
                   <div key={b.id}>
                     <div className="hidden md:block"><DesktopRow b={b} isHistory={false} /></div>
                     <div className="md:hidden p-3 bg-slate-50/50"><MobileCard b={b} /></div>
                   </div>
                ))}
             </div>
          </div>
        )}
      </section>

      {/* 2. History List */}
      <section>
        <div 
          className="flex items-center gap-2 cursor-pointer select-none py-2 group"
          onClick={() => setShowHistory(!showHistory)}
        >
          <div className={`p-1 rounded transition-colors ${showHistory ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'}`}>
             <ChevronRight className={`h-4 w-4 transition-transform ${showHistory ? 'rotate-90' : ''}`} />
          </div>
          <span className="text-sm font-bold text-slate-500 group-hover:text-slate-800">历史归档 (History)</span>
          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full text-slate-400">{historyBookings.length}</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {showHistory && (
          <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden opacity-80">
             {historyBookings.map(b => (
                <div key={b.id}>
                  <div className="hidden md:block"><DesktopRow b={b} isHistory={true} /></div>
                  <div className="md:hidden p-3"><MobileCard b={b} /></div>
                </div>
             ))}
          </div>
        )}
      </section>

      {/* Edit Dialog (不变) */}
      <Dialog open={!!editingBooking} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>编辑课程</DialogTitle></DialogHeader>
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