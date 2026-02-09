"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { getDashboardStats } from "./dashboard-actions";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, PiggyBank, CalendarPlus, PenLine, 
  Loader2, ArrowUpRight, ChevronRight, AlertCircle,
  X, Clock, MapPin
} from "lucide-react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from "date-fns";

export default function Home() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    cashIncome: 0, netCashFlow: 0, realizedRevenue: 0, unearnedRevenue: 0,
    chartData: [], calendarBookings: [], lowBalanceStudents: []
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayDetails, setDayDetails] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const data = await getDashboardStats(currentBusinessId);
        setStats(data);
      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    }
    if (currentBusinessId) fetchData();
  }, [currentBusinessId]);

  const today = new Date();
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(today), end: endOfMonth(today) });

  const handleDayClick = (day: Date, bookings: any[]) => {
    if (bookings.length === 0) return;
    setSelectedDate(day);
    setDayDetails(bookings);
    setIsModalOpen(true);
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50/50 font-sans text-slate-900 pb-10">
      <Navbar />

      <div className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="grid grid-cols-12 gap-6">

          {/* Row 1: KPI Cards */}
          <Link href="/bookings" className="col-span-12 md:col-span-6 group">
            <Card className="h-full border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 hover:shadow-md hover:border-emerald-200 cursor-pointer relative overflow-hidden transition-all">
               <div className="absolute right-0 top-0 p-4 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity"><TrendingUp className="h-24 w-24 text-emerald-600" /></div>
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-2"><TrendingUp className="h-4 w-4" /> 本月消课产值 (Realized)</CardTitle>
                   <ArrowUpRight className="h-4 w-4 text-emerald-300 group-hover:text-emerald-600" />
                 </div>
               </CardHeader>
               <CardContent>
                 {loading ? <Loader2 className="h-8 w-8 animate-spin text-emerald-200" /> : (
                   <div>
                     <div className="text-4xl font-bold text-slate-900 tabular-nums">${stats.realizedRevenue.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                     <p className="mt-1 text-xs text-slate-500 font-medium">点击查看具体消课记录</p>
                   </div>
                 )}
               </CardContent>
            </Card>
          </Link>

          <Link href="/students" className="col-span-12 md:col-span-6 group">
            <Card className="h-full border-indigo-100 bg-gradient-to-br from-white to-indigo-50/40 hover:shadow-md hover:border-indigo-200 cursor-pointer relative overflow-hidden transition-all">
               <div className="absolute right-0 top-0 p-4 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity"><PiggyBank className="h-24 w-24 text-indigo-600" /></div>
               <CardHeader className="pb-2">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-2"><PiggyBank className="h-4 w-4" /> 待消课资金池 (Unearned)</CardTitle>
                   <ArrowUpRight className="h-4 w-4 text-indigo-300 group-hover:text-indigo-600" />
                 </div>
               </CardHeader>
               <CardContent>
                 {loading ? <Loader2 className="h-8 w-8 animate-spin text-indigo-200" /> : (
                   <div>
                     <div className="text-4xl font-bold text-slate-900 tabular-nums">${stats.unearnedRevenue.toLocaleString('en-NZ', { minimumFractionDigits: 2 })}</div>
                     <p className="mt-1 text-xs text-slate-500 font-medium">点击查看学员余额详情</p>
                   </div>
                 )}
               </CardContent>
            </Card>
          </Link>

          {/* Row 2: Cash Flow & Quick Actions */}
          <Link href="/finance" className="col-span-12 md:col-span-8 group">
            <Card className="h-full border-slate-200 shadow-sm flex flex-col hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer">
              <CardHeader className="pb-2 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      本月现金流趋势 <ArrowUpRight className="h-3 w-3 text-slate-300 group-hover:text-indigo-50 opacity-0 group-hover:opacity-100 transition-all" />
                    </CardTitle>
                    <p className="text-xs text-slate-400 mt-1">Cash Flow Overview (Income vs Expense)</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xl font-bold tabular-nums block ${stats.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {stats.netCashFlow >= 0 ? '+' : ''}${stats.netCashFlow.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Net Profit</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-4 min-h-[200px]">
                {loading ? <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-slate-300"/></div> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.chartData} barGap={0}>
                      <XAxis dataKey="date" tickFormatter={(val) => val.split('-')[2]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} interval={2} />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </Link>

          <div className="col-span-12 md:col-span-4 flex flex-col gap-6">
            <Link href="/finance/add" className="flex-1">
              <Card className="h-full border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 group-hover:scale-110 transition-transform"><PenLine className="h-7 w-7" /></div>
                  <h3 className="font-bold text-slate-700">记一笔</h3>
                  <p className="text-xs text-slate-400 mt-1">Record Transaction</p>
                </div>
              </Card>
            </Link>
            <Link href="/bookings/new" className="flex-1">
              <Card className="h-full border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex items-center justify-center p-6">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:scale-110 transition-transform"><CalendarPlus className="h-7 w-7" /></div>
                  <h3 className="font-bold text-slate-700">新建预约</h3>
                  <p className="text-xs text-slate-400 mt-1">New Booking</p>
                </div>
              </Card>
            </Link>
          </div>

          {/* Row 2.5: Low Balance Alert */}
          {!loading && stats.lowBalanceStudents.length > 0 && (
            <Card className="col-span-12 border-rose-100 bg-rose-50/30">
              <CardHeader className="pb-2 pt-4 border-b border-rose-100">
                <CardTitle className="text-sm font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> 续费提醒：余额不足 3 课时的学员
                  <span className="bg-rose-100 text-rose-700 text-[10px] px-1.5 py-0.5 rounded-full">{stats.lowBalanceStudents.length}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3">
                <div className="flex flex-wrap gap-2">
                  {stats.lowBalanceStudents.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-lg border border-rose-100 shadow-sm min-w-[140px]">
                       <span className="text-sm font-bold text-slate-700">{s.name}</span>
                       <span className={`text-xs font-bold ${Number(s.balance) <= 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                         {Number(s.balance)} 课时
                       </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Row 3: Calendar */}
          <Card className="col-span-12 border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800">本月排课概览</CardTitle>
                <p className="text-xs text-slate-400 mt-1">{format(today, 'MMMM yyyy')} • Schedule Overview</p>
              </div>
              <Link href="/bookings">
                <Button variant="ghost" size="sm" className="text-xs text-indigo-600 hover:bg-indigo-50">查看详情 <ChevronRight className="ml-1 h-3 w-3" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400 uppercase">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 md:gap-2">
                {daysInMonth.map((day) => {
                  const dayBookings = stats.calendarBookings.filter((b: any) => isSameDay(new Date(b.start_time), day));
                  const isTodayDate = isToday(day);
                  const hasBooking = dayBookings.length > 0;

                  return (
                    <div 
                      key={day.toISOString()} 
                      onClick={() => handleDayClick(day, dayBookings)}
                      className={`min-h-[100px] rounded-xl border p-2 flex flex-col gap-1 transition-all ${isTodayDate ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-100'} ${hasBooking ? 'hover:border-indigo-300 hover:shadow-sm cursor-pointer hover:scale-[1.02]' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-xs font-semibold ${isTodayDate ? 'text-indigo-700' : 'text-slate-400'}`}>{format(day, 'd')}</span>
                        {hasBooking && <span className="bg-indigo-100 text-indigo-700 text-[9px] px-1.5 rounded-full font-bold">{dayBookings.length}</span>}
                      </div>
                      <div className="flex flex-col gap-1.5 mt-1">
                        {dayBookings.slice(0, 3).map((b: any) => (
                          <div key={b.id} className="flex flex-col gap-0.5 px-1.5 py-1 rounded bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-1">
                              <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${b.status === 'completed' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              <span className="text-[10px] font-bold text-slate-700 truncate leading-tight">{b.student?.name}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 truncate pl-2.5 leading-tight">{b.student?.subject || "科目未填"}</span>
                          </div>
                        ))}
                        {dayBookings.length > 3 && <div className="text-[9px] text-slate-400 pl-1">+{dayBookings.length - 3} more...</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✅ 修复优化：弹窗交互 */}
      {isModalOpen && selectedDate && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-pointer"
          onClick={() => setIsModalOpen(false)} // ✅ 点击背景关闭
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()} // ✅ 阻止点击内容区域时关闭
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900">{format(selectedDate, 'MMMM d, yyyy')}</h3>
                <p className="text-xs text-slate-500">共 {dayDetails.length} 节课程</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 transition-colors"><X className="h-5 w-5 text-slate-500" /></button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
              {dayDetails.map((b) => (
                <div key={b.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">{b.student?.name?.charAt(0)}</div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{b.student?.name}</div>
                        <div className="text-xs text-indigo-600 font-medium">{b.student?.subject || "无科目"}</div>
                      </div>
                    </div>
                    <Badge variant={b.status === 'completed' ? 'default' : 'outline'} className={b.status === 'completed' ? 'bg-emerald-500' : ''}>
                      {b.status === 'completed' ? '已完成' : '待进行'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-xs text-slate-600"><Clock className="h-3.5 w-3.5 text-slate-400" />{new Date(b.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} ({b.duration}h)</div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 truncate"><MapPin className="h-3.5 w-3.5 text-slate-400" />{b.location || "线上/默认"}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <Link href="/bookings"><Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">前往排课表管理</Button></Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}