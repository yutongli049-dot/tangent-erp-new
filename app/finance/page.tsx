"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useBusiness } from "@/contexts/BusinessContext"; // ✅ 引入 Context
import { getFinanceStats } from "./actions"; // ✅ 引入新的 Action
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Loader2, Plus, DollarSign, Calendar as CalendarIcon,
  Home as HomeIcon, Users, CalendarPlus, PenLine, FileBarChart
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format } from "date-fns";

export default function FinancePage() {
  const { currentBusinessId } = useBusiness(); // ✅ 获取当前业务ID
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month"); // week, month, prev_month, 3months...
  const [data, setData] = useState<any>({
    income: 0, expense: 0, net: 0, realized: 0,
    transactions: [], chartData: []
  });

  useEffect(() => {
    async function loadData() {
      if (!currentBusinessId) return; // 🛡️ 没ID不查
      
      setLoading(true);
      try {
        // ✅ 传入 currentBusinessId 和 range
        const res = await getFinanceStats(currentBusinessId, range);
        setData(res);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    }
    loadData();
  }, [range, currentBusinessId]); // ✅ 依赖项变更时自动刷新

  // 底部导航项组件
  const TabItem = ({ href, icon: Icon, label, isActive }: any) => (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 flex-1 active:scale-95 transition-transform py-2 group ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`h-6 w-6 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
        <Icon className="h-full w-full" />
      </div>
      <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-10 font-sans text-slate-900">
      {/* 1. Desktop Navbar */}
      <div className="hidden md:block"><Navbar /></div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* 2. Header & Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8 pt-4 md:pt-0">
          <div>
             <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
               <Wallet className="h-6 w-6 text-indigo-600" />
               财务驾驶舱 (Finance)
             </h1>
             <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider pl-8">
               Revenue & Expense Overview
             </p>
          </div>
          
          {/* Filters (Scrollable on Mobile) */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'week', label: '本周' },
              { id: 'month', label: '本月' },
              { id: 'prev_month', label: '上月' }, // ✅ 对应 actions.ts 里的 key
              { id: '3months', label: '近3月' },
              { id: 'year', label: '全年' }
            ].map((r) => (
              <button
                key={r.id}
                onClick={() => setRange(r.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-1 md:flex-none ${
                  range === r.id 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Stats Cards (Snap Scroll on Mobile) */}
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-6 no-scrollbar snap-x snap-mandatory">
          
          {/* Income */}
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-emerald-100 bg-emerald-50/50 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">现金收入 (In)</p>
                 <h2 className="text-3xl font-black text-slate-900 mt-2">${data.income.toLocaleString()}</h2>
               </div>
               <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                 <ArrowDownRight className="h-5 w-5" />
               </div>
             </div>
          </Card>

          {/* Expense */}
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-rose-100 bg-rose-50/50 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">现金支出 (Out)</p>
                 <h2 className="text-3xl font-black text-slate-900 mt-2">${data.expense.toLocaleString()}</h2>
               </div>
               <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                 <ArrowUpRight className="h-5 w-5" />
               </div>
             </div>
          </Card>

          {/* Net */}
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-indigo-100 bg-indigo-50/50 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">净现金流 (Net)</p>
                 <h2 className={`text-3xl font-black mt-2 ${data.net >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                   {data.net >= 0 ? '+' : ''}${data.net.toLocaleString()}
                 </h2>
               </div>
               <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                 <Wallet className="h-5 w-5" />
               </div>
             </div>
          </Card>

          {/* Realized */}
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-amber-100 bg-amber-50/50 shadow-sm relative overflow-hidden flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div>
                 <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">消课产值 (Realized)</p>
                 <h2 className="text-3xl font-black text-slate-900 mt-2">${data.realized.toLocaleString()}</h2>
               </div>
               <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                 <TrendingUp className="h-5 w-5" />
               </div>
             </div>
          </Card>
        </div>

        {/* 4. Chart Section (Mobile Horizontal Scroll Optimized) */}
        <div className="mt-6 md:mt-8">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-slate-400" /> 趋势分析 (Trend)
          </h3>
          <Card className="p-4 md:p-6 border-slate-200 shadow-sm overflow-hidden bg-white">
            {/* ⚠️ 核心优化：外层容器允许横向滚动 */}
            <div className="overflow-x-auto no-scrollbar w-full pb-2">
               {/* 内层容器：在手机端强制最小宽度 (例如 600px)，保证柱子不挤 */}
               <div className="h-[250px] md:h-[300px] min-w-[600px] md:min-w-full">
                 {loading ? (
                   <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300"/></div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.chartData} barGap={0} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          axisLine={false} 
                          tickLine={false}
                          dy={10}
                       />
                       <YAxis 
                          tick={{ fontSize: 10, fill: '#94a3b8' }} 
                          axisLine={false} 
                          tickLine={false}
                       />
                       <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                       />
                       <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                       {/* 柱子加粗，圆角 */}
                       <Bar dataKey="income" name="收入 In" fill="#10b981" radius={[4, 4, 0, 0]} barSize={range === 'week' ? 20 : 8} />
                       <Bar dataKey="expense" name="支出 Out" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={range === 'week' ? 20 : 8} />
                       <Bar dataKey="realized" name="产值 Realized" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={range === 'week' ? 20 : 8} />
                     </BarChart>
                   </ResponsiveContainer>
                 )}
               </div>
            </div>
            <p className="text-[10px] text-center text-slate-400 mt-2 md:hidden">← 左右滑动查看完整图表 →</p>
          </Card>
        </div>

        {/* 5. Transactions List */}
        <div className="mt-8">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
               <DollarSign className="h-4 w-4 text-slate-400" /> 近期流水 (Recent)
             </h3>
             <Link href="/finance/add">
               <Button size="sm" variant="outline" className="h-8 text-xs font-bold rounded-full border-slate-200">
                 <Plus className="h-3 w-3 mr-1" /> 记一笔
               </Button>
             </Link>
           </div>
           
           <div className="space-y-3">
             {loading ? (
               <div className="text-center py-10"><Loader2 className="animate-spin text-slate-300 mx-auto"/></div>
             ) : data.transactions.length === 0 ? (
               <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                 本时段无流水记录
               </div>
             ) : (
               data.transactions.map((t: any) => (
                 <div key={t.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-center justify-between shadow-sm active:scale-[0.99] transition-transform">
                    <div className="flex items-center gap-4">
                       <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                         t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                       }`}>
                         {t.type === 'income' ? <ArrowDownRight className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
                       </div>
                       <div>
                         <div className="text-sm font-bold text-slate-900 line-clamp-1">{t.category || "未分类"}</div>
                         <div className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-[150px] md:max-w-md font-medium">
                           {t.description || format(new Date(t.transaction_date), "MMM d, HH:mm")}
                         </div>
                       </div>
                    </div>
                    <div className={`text-base font-black font-mono whitespace-nowrap ${
                      t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>

      </main>
      
      {/* 6. Mobile Bottom Dock (App Style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/60 pb-safe pt-1 px-6 z-50">
        <div className="flex justify-between items-center">
          <TabItem href="/" icon={HomeIcon} label="首页" isActive={false} />
          <TabItem href="/students" icon={Users} label="学生" isActive={false} />
          <Link href="/finance/add" className="active:scale-90 transition-transform -mt-8">
             <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-400/50 border-4 border-slate-50">
               <PenLine className="h-6 w-6" />
             </div>
          </Link>
          <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={false} />
          <TabItem href="/finance" icon={FileBarChart} label="报表" isActive={true} />
        </div>
      </div>
    </div>
  );
}