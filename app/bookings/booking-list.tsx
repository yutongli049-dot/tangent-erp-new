"use client";

import { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { completeBooking, cancelBooking } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, CheckCircle2, XCircle, User, Loader2 } from "lucide-react";

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: string;
  location: string | null;
  student: {
    id: string;
    name: string;
  };
  business_unit_id: string;
};

export function BookingList({ bookings }: { bookings: Booking[] }) {
  const { currentBusinessId } = useBusiness();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 1. 过滤当前公司
  const filteredBookings = bookings.filter((b) => {
    if (currentBusinessId === "tangent") return true;
    return b.business_unit_id === currentBusinessId;
  });

  // 2. 分组：待办 vs 历史
  const now = new Date();
  const upcoming = filteredBookings.filter(b => new Date(b.start_time) >= now && b.status === 'confirmed');
  const pastOrDone = filteredBookings.filter(b => new Date(b.start_time) < now || b.status !== 'confirmed');

  // 处理完成
  const handleComplete = async (b: Booking) => {
    if (!confirm(`确认完成课程？\n学员: ${b.student.name}\n将扣除余额: ${b.duration} 课时`)) return;
    setLoadingId(b.id);
    await completeBooking(b.id, b.student.id, b.duration);
    setLoadingId(null);
  };

  // 处理取消
  const handleCancel = async (id: string) => {
    if (!confirm("确定取消这个预约吗？")) return;
    setLoadingId(id);
    await cancelBooking(id);
    setLoadingId(null);
  };

  // 渲染单个卡片
  const BookingCard = ({ booking, isActionable }: { booking: Booking, isActionable: boolean }) => (
    <Card className="flex flex-col gap-3 p-4 border-slate-200/70 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <Badge variant={booking.status === 'confirmed' ? 'default' : booking.status === 'completed' ? 'secondary' : 'destructive'}>
            {booking.status === 'confirmed' ? '待进行' : booking.status === 'completed' ? '已完成' : '已取消'}
          </Badge>
          <span className="text-sm text-slate-500">
            {new Date(booking.start_time).toLocaleDateString()}
          </span>
        </div>
        <div className="text-sm font-bold text-slate-900 flex items-center gap-1">
          <User className="h-3 w-3 text-slate-400" />
          {booking.student?.name || "未知学员"}
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-700">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-indigo-500" />
          {new Date(booking.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
          <span className="text-slate-400 text-xs">({booking.duration}h)</span>
        </div>
        {booking.location && (
          <div className="flex items-center gap-1.5 truncate max-w-[150px]">
            <MapPin className="h-4 w-4 text-slate-400" />
            {booking.location}
          </div>
        )}
      </div>

      {isActionable && (
        <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3">
          <Button 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-9 text-xs"
            onClick={() => handleComplete(booking)}
            disabled={loadingId === booking.id}
          >
            {loadingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="mr-1 h-3 w-3" /> 完成 (扣费)</>}
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 h-9 text-xs hover:bg-rose-50 hover:text-rose-600 border-slate-200"
            onClick={() => handleCancel(booking.id)}
            disabled={loadingId === booking.id}
          >
            <XCircle className="mr-1 h-3 w-3" /> 取消
          </Button>
        </div>
      )}
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* 待办列表 */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          📅 待办课程 (Upcoming)
          <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">{upcoming.length}</span>
        </h3>
        {upcoming.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
            暂无待办课程
          </div>
        ) : (
          upcoming.map(b => <BookingCard key={b.id} booking={b} isActionable={true} />)
        )}
      </section>

      {/* 历史列表 */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400">🕒 历史记录 (History)</h3>
        <div className="opacity-70 grayscale-[0.5]">
          {pastOrDone.length === 0 && <p className="text-xs text-slate-400">暂无历史记录</p>}
          {pastOrDone.map(b => <BookingCard key={b.id} booking={b} isActionable={false} />)}
        </div>
      </section>
    </div>
  );
}