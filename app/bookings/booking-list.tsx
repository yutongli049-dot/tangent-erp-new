"use client";

import { useState } from "react";
import { useBusiness } from "@/contexts/BusinessContext";
import { completeBooking, cancelBooking, deleteBooking } from "./actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, CheckCircle2, XCircle, User, Loader2, AlertCircle, Trash2, GraduationCap } from "lucide-react";

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
    teacher: string | null; // ✅ 新增老师字段
  } | null;
  business_unit_id: string;
};

// 定义分组后的结构
type StudentGroup = {
  studentId: string;
  studentName: string;
  teacherName: string;
  bookings: Booking[];
};

export function BookingList({ bookings }: { bookings: Booking[] }) {
  const { currentBusinessId } = useBusiness();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // 1. 基础过滤：只看当前公司
  const filteredBookings = bookings.filter((b) => {
    if (currentBusinessId === "tangent") return true;
    return b.business_unit_id === currentBusinessId;
  });

  // 2. 状态分流
  const rawPending = filteredBookings.filter(b => b.status === 'confirmed');
  const rawHistory = filteredBookings.filter(b => b.status !== 'confirmed');

  // --- 核心逻辑：分组与排序函数 ---
  const groupAndSort = (list: Booking[]): StudentGroup[] => {
    const groups: Record<string, StudentGroup> = {};

    // A. 分组
    list.forEach(b => {
      const sId = b.student?.id || "unknown";
      const sName = b.student?.name || "未知学员";
      const teacher = b.student?.teacher || "未分配老师";

      if (!groups[sId]) {
        groups[sId] = {
          studentId: sId,
          studentName: sName,
          teacherName: teacher,
          bookings: []
        };
      }
      groups[sId].bookings.push(b);
    });

    // B. 转换为数组
    const groupArray = Object.values(groups);

    // C. 组间排序：先按老师首字母，再按学员首字母
    groupArray.sort((a, b) => {
      if (a.teacherName !== b.teacherName) {
        return a.teacherName.localeCompare(b.teacherName, 'zh-CN'); // 支持中文拼音排序
      }
      return a.studentName.localeCompare(b.studentName, 'zh-CN');
    });

    // D. 组内排序：按时间正序 (虽然数据库已排，再保底一次)
    groupArray.forEach(g => {
      g.bookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    });

    return groupArray;
  };

  const groupedPending = groupAndSort(rawPending);
  const groupedHistory = groupAndSort(rawHistory);

  // --- 操作函数 ---
  const handleComplete = async (b: Booking) => {
    const studentName = b.student?.name || "该学员";
    if (!confirm(`确认完成课程？\n学员: ${studentName}\n将扣除余额: ${b.duration} 课时`)) return;
    setLoadingId(b.id);
    if (b.student?.id) await completeBooking(b.id, b.student.id, b.duration);
    setLoadingId(null);
  };

  const handleCancel = async (id: string) => {
    if (!confirm("确定取消这个预约吗？")) return;
    setLoadingId(id);
    await cancelBooking(id);
    setLoadingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("⚠️ 彻底删除此记录？此操作无法撤销。")) return;
    setLoadingId(id);
    await deleteBooking(id);
    setLoadingId(null);
  };

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  // --- 子组件：单个卡片 ---
  const BookingCard = ({ booking, isActionable }: { booking: Booking, isActionable: boolean }) => {
    const overdue = isActionable && isOverdue(booking.start_time);
    return (
      <Card className={`flex flex-col gap-3 p-3 border-slate-200/60 shadow-sm transition-all ${overdue ? 'bg-amber-50/40 border-amber-200' : 'bg-white'}`}>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Badge variant={booking.status === 'confirmed' ? (overdue ? 'destructive' : 'default') : booking.status === 'completed' ? 'secondary' : 'outline'} className="text-[10px] h-5 px-1.5">
              {booking.status === 'confirmed' ? (overdue ? '逾期' : '待办') : booking.status === 'completed' ? '完成' : '取消'}
            </Badge>
            <span className="text-xs font-medium text-slate-500">
              {new Date(booking.start_time).toLocaleDateString()}
            </span>
          </div>
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
            <Button 
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-7 text-[10px]"
              onClick={() => handleComplete(booking)}
              disabled={loadingId === booking.id}
            >
              {loadingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "完成"}
            </Button>
            <Button 
              variant="outline" 
              className="flex-1 h-7 text-[10px] hover:bg-rose-50 hover:text-rose-600"
              onClick={() => handleCancel(booking.id)}
              disabled={loadingId === booking.id}
            >
              取消
            </Button>
          </div>
        ) : (
          <div className="mt-1 flex justify-end pt-2 border-t border-slate-50">
             <button 
                onClick={() => handleDelete(booking.id)}
                disabled={loadingId === booking.id}
                className="text-[10px] text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors"
             >
                {loadingId === booking.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />} 删除
             </button>
          </div>
        )}
      </Card>
    );
  };

  // --- 子组件：学员分组容器 ---
  const StudentSection = ({ groups, title, isEmpty }: { groups: StudentGroup[], title: string, isEmpty: boolean }) => (
    <section className="space-y-4">
      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 sticky top-16 bg-slate-50 py-2 z-10 border-b border-slate-200/50">
        {title}
        {!isEmpty && <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded-full">{groups.reduce((acc, g) => acc + g.bookings.length, 0)}</span>}
      </h3>
      
      {isEmpty ? (
        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
          暂无相关记录
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.studentId} className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
              {/* 学员 Header */}
              <div className="bg-slate-50/50 px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                    {group.studentName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{group.studentName}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <GraduationCap className="h-3 w-3" />
                      老师: {group.teacherName}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {group.bookings.length} 节课
                </div>
              </div>
              
              {/* 课程 Grid */}
              <div className="p-3 grid grid-cols-1 gap-3">
                {group.bookings.map(b => (
                  <BookingCard key={b.id} booking={b} isActionable={b.status === 'confirmed'} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <div className="space-y-10">
      <StudentSection 
        title="📅 待处理课程 (Pending)" 
        groups={groupedPending} 
        isEmpty={groupedPending.length === 0} 
      />
      
      <StudentSection 
        title="🕒 归档记录 (History)" 
        groups={groupedHistory} 
        isEmpty={groupedHistory.length === 0} 
      />
    </div>
  );
}