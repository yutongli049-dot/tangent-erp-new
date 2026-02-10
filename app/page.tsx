"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBusiness } from "@/contexts/BusinessContext";
import { getDashboardStats } from "./dashboard-actions";
import { createClient } from "@/lib/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, PiggyBank, PenLine, 
  Loader2, MapPin, 
  Wallet, AlertCircle, Sun, Moon, Calendar as CalendarIcon, 
  Home as HomeIcon, ArrowUpRight, Clock, User, BookOpen,
  Users, FileBarChart, LogOut, ChevronDown, Check, Building2
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { format, isAfter, isSameDay } from "date-fns";
import { zhCN } from "date-fns/locale";

// 简单的下拉菜单组件 (避免依赖 shadcn/ui 组件库文件缺失)
function MobileUserMenu({ user, currentLabel, businesses, onSwitch, onSignOut }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 w-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-sm overflow-hidden active:scale-95 transition-transform"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
        ) : <span className="text-xs font-bold text-slate-500">...</span>}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="px-4 py-2 border-b border-slate-50 mb-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">切换业务 (Switch)</p>
          </div>
          {businesses.map((b: any) => (
            <button
              key={b.id}
              onClick={() => { onSwitch(b.id); setIsOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-400" />
                {b.name}
              </span>
              {currentLabel === b.name && <Check className="h-4 w-4 text-indigo-600" />}
            </button>
          ))}
          <div className="h-px bg-slate-100 my-1" />
          <button
            onClick={onSignOut}
            className="w-full text-left px-4 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" /> 退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const { currentBusinessId, currentLabel, setBusinessId } = useBusiness();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [businessList, setBusinessList] = useState<any[]>([]); // 存储业务列表
  
  const [stats, setStats] = useState<any>({
    cashIncome: 0, netCashFlow: 0, realizedRevenue: 0, unearnedRevenue: 0,
    chartData: [], calendarBookings: [], lowBalanceStudents: []
  });
  
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    async function initData() {
      const supabase = createClient();
      
      // 1. 获取用户信息
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setUserProfile(profile || { 
          full_name: user.email?.split('@')[0], 
          avatar_url: `https://api.dicebear.com/9.x/notionists/svg?seed=${user.email}` 
        });
      }

      // 2. 获取业务列表 (用于下拉菜单)
      // 如果没有 business_units 表，这里可以写死 fallback
      const { data: units } = await supabase.from('business_units').select('id, name').order('name');
      if (units && units.length > 0) {
        setBusinessList(units);
      } else {
        // Fallback data if table is empty
        setBusinessList([
          { id: 'cus', name: 'CuS Academy' },
          { id: 'sine', name: 'Sine Studio' },
          { id: 'tangent', name: 'Tangent Group' }
        ]);
      }

      // 3. 获取仪表盘数据
      if (currentBusinessId) {
        setLoading(true);
        try {
          const data = await getDashboardStats(currentBusinessId);
          setStats(data);
        } catch (error) { console.error(error); } 
        finally { setLoading(false); }
      }
    }
    initData();
  }, [currentBusinessId]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.offsetWidth;
      setActiveCardIndex(Math.round(scrollLeft / width));
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "早安" : hour < 18 ? "下午好" : "晚上好";
  const GreetingIcon = hour < 18 ? Sun : Moon;

  const now = new Date();
  const futureBookings = stats.calendarBookings
    .filter((b: any) => isAfter(new Date(b.start_time), now))
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  // 底部导航项
  const TabItem = ({ href, icon: Icon, label, isActive }: any) => (
    <Link href={href} className={`flex flex-col items-center justify-center gap-1 flex-1 active:scale-95 transition-transform py-2 group ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
      <div className={`h-6 w-6 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'} transition-colors`}>
        <Icon className="h-full w-full" />
      </div>
      <span className={`text-[10px] font-medium ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-slate-800'}`}>{label}</span>
    </Link>
  );

  return (
    <>
      <div className="hidden md:block"><Navbar /></div>

      <main className="md:min-h-screen bg-slate-50 font-sans text-slate-900 h-[100dvh] md:h-auto flex flex-col md:block overflow-hidden md:overflow-visible">
        
        {/* --- PART 1: HEADER & CARDS --- */}
        <div className="shrink-0 z-20 bg-slate-50 md:bg-transparent pb-2 relative">
          
          {/* Mobile Header (带头像菜单) */}
          <div className="md:hidden px-6 pt-12 pb-4 flex justify-between items-center bg-slate-50">
            <div>
              <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                <GreetingIcon className="h-3 w-3 text-amber-500" />
                <span>{format(new Date(), "M月d日 EEEE", { locale: zhCN })}</span>
              </div>
              <div className="flex items-center gap-1">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Hi, <span className="text-indigo-600 truncate max-w-[150px]">{userProfile?.full_name || "..."}</span>
                </h1>
                <Badge variant="outline" className="ml-2 text-[10px] h-5 bg-white border-slate-200 text-slate-500">
                  {currentLabel}
                </Badge>
              </div>
            </div>
            {/* 头像菜单 */}
            <MobileUserMenu 
              user={userProfile} 
              currentLabel={currentLabel} 
              businesses={businessList} 
              onSwitch={setBusinessId}
              onSignOut={handleSignOut}
            />
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex max-w-7xl mx-auto px-6 pt-8 pb-6 justify-between items-end">
             <div>
               <p className="text-slate-500 text-sm font-bold mb-1 flex items-center gap-2">
                 {format(new Date(), "yyyy年M月d日 EEEE", { locale: zhCN })}
               </p>
               <h1 className="text-3xl font-extrabold text-slate-900">
                 {greeting}, <span className="text-indigo-600">{userProfile?.full_name}</span>
               </h1>
             </div>
             {userProfile?.avatar_url && <img src={userProfile.avatar_url} className="h-12 w-12 rounded-full border-2 border-white shadow-sm" />}
          </div>

          {/* Cards Container */}
          <div className="relative w-full max-w-7xl mx-auto">
            <div ref={scrollRef} onScroll={handleScroll} className="md:hidden flex snap-x snap-mandatory overflow-x-auto gap-0 no-scrollbar px-5 py-2">
              
              {/* Card 1: Net Cash */}
              <Link href="/finance" className="snap-center w-full min-w-full px-1 block active:scale-[0.98] transition-transform">
                <div className="h-44 rounded-3xl bg-indigo-600 p-6 text-white shadow-xl shadow-indigo-200 relative overflow-hidden flex flex-col z-0">
                   <div className="z-10 relative">
                     <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                       <Wallet className="h-3 w-3" /> 净现金流 (Net)
                     </p>
                     <h2 className="text-4xl font-black tracking-tight flex items-center gap-2">
                       {stats.netCashFlow >= 0 ? '+' : ''}${stats.netCashFlow.toLocaleString()}
                       <ArrowUpRight className="h-5 w-5 opacity-50" />
                     </h2>
                   </div>
                   <div className="absolute bottom-0 left-0 right-0 h-24 w-full opacity-30 pointer-events-none z-0">
                     {mounted && stats.chartData.length > 0 && (
                       <ResponsiveContainer width="100%" height="100%">
                         <AreaChart data={stats.chartData}>
                           <defs><linearGradient id="colorNetMobile" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ffffff" stopOpacity={0.8}/><stop offset="95%" stopColor="#ffffff" stopOpacity={0}/></linearGradient></defs>
                           <Area type="monotone" dataKey="net" stroke="#ffffff" strokeWidth={3} fill="url(#colorNetMobile)" isAnimationActive={false} />
                         </AreaChart>
                       </ResponsiveContainer>
                     )}
                   </div>
                </div>
              </Link>

              {/* Card 2: Realized */}
              <Link href="/bookings" className="snap-center w-full min-w-full px-1 block active:scale-[0.98] transition-transform">
                <div className="h-44 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                   <div className="absolute right-[-15px] top-[-15px] opacity-[0.07] pointer-events-none"><TrendingUp className="h-32 w-32 text-indigo-900" /></div>
                   <div className="z-10">
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                       <Clock className="h-3 w-3" /> 本月已消课
                     </p>
                     <h2 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                       ${stats.realizedRevenue.toLocaleString()}
                       <ArrowUpRight className="h-5 w-5 text-slate-300" />
                     </h2>
                   </div>
                   <div className="z-10 mt-auto">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">点击查看排课</span>
                   </div>
                </div>
              </Link>

              {/* Card 3: Pool */}
              <Link href="/students" className="snap-center w-full min-w-full px-1 block active:scale-[0.98] transition-transform">
                <div className="h-44 rounded-3xl bg-slate-900 p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                   <div className="absolute right-[-10px] bottom-[-10px] opacity-10 pointer-events-none"><PiggyBank className="h-32 w-32" /></div>
                   <div className="z-10">
                     <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                        <PiggyBank className="h-3 w-3" /> 资金池 (Pool)
                     </p>
                     <h2 className="text-4xl font-black tracking-tight flex items-center gap-2">
                       ${stats.unearnedRevenue.toLocaleString()}
                       <ArrowUpRight className="h-5 w-5 opacity-50" />
                     </h2>
                   </div>
                   <div className="text-xs text-slate-600 font-medium z-10">* 预收学费总额</div>
                </div>
              </Link>
            </div>
            
            <div className="flex md:hidden justify-center gap-2 mt-3 mb-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeCardIndex ? 'w-4 bg-indigo-600' : 'w-1.5 bg-slate-300'}`} />
              ))}
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid grid-cols-3 gap-6 px-6">
               {/* ... (Desktop cards code remains same) ... */}
               <Link href="/finance" className="block hover:scale-[1.02] transition-transform relative group">
                  <div className="h-48 rounded-3xl bg-indigo-600 p-6 text-white shadow-lg relative overflow-hidden">
                     <div className="z-10 relative">
                       <p className="text-indigo-200 text-xs font-bold uppercase">净现金流 (Net)</p>
                       <h2 className="text-4xl font-black mt-2 flex items-center gap-2">${stats.netCashFlow.toLocaleString()} <ArrowUpRight className="h-5 w-5 opacity-50"/></h2>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 h-24 w-full opacity-30 group-hover:opacity-40 transition-opacity pointer-events-none">
                        {mounted && <ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.chartData}><defs><linearGradient id="colorNetDesktop" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#fff" stopOpacity={0.5}/><stop offset="95%" stopColor="#fff" stopOpacity={0}/></linearGradient></defs><Area type="monotone" dataKey="net" stroke="#fff" strokeWidth={3} fill="url(#colorNetDesktop)" isAnimationActive={false} /></AreaChart></ResponsiveContainer>}
                     </div>
                  </div>
               </Link>
               <Link href="/bookings" className="block hover:scale-[1.02] transition-transform">
                  <div className="h-48 rounded-3xl bg-white border border-slate-200 p-6 shadow-sm relative overflow-hidden flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all">
                     <div><p className="text-slate-500 text-xs font-bold uppercase">本月已消课</p><h2 className="text-4xl font-black mt-2 text-slate-900">${stats.realizedRevenue.toLocaleString()}</h2></div>
                     <div className="text-right"><div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center ml-auto"><ArrowUpRight className="h-5 w-5 text-slate-400"/></div></div>
                  </div>
               </Link>
               <Link href="/students" className="block hover:scale-[1.02] transition-transform">
                  <div className="h-48 rounded-3xl bg-slate-900 p-6 text-white shadow-lg relative overflow-hidden flex flex-col justify-between">
                     <div><p className="text-slate-500 text-xs font-bold uppercase">资金池 (负债)</p><h2 className="text-4xl font-black mt-2">${stats.unearnedRevenue.toLocaleString()}</h2></div>
                     <div className="text-right"><div className="h-10 w-10 bg-slate-800 rounded-full flex items-center justify-center ml-auto"><ArrowUpRight className="h-5 w-5 text-slate-400"/></div></div>
                  </div>
               </Link>
            </div>
          </div>
        </div>

        {/* --- PART 2: LIST AREA (Auto-Expand) --- */}
        <div className="flex-1 px-5 pt-0 pb-24 md:pb-6 md:px-6 max-w-7xl mx-auto w-full md:grid md:grid-cols-3 md:gap-8 overflow-y-auto md:overflow-visible">
          
          <div className="md:col-span-2 flex flex-col">
             {/* ✅ 修复：不透明背景 + z-index，防止列表内容透出来 */}
             <div className="sticky top-0 bg-slate-50 z-30 py-4 border-b border-slate-100/50 mb-2 shadow-[0_4px_10px_-10px_rgba(0,0,0,0.1)]">
               <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                 <CalendarIcon className="h-5 w-5 text-indigo-600" />
                 未来课程 <span className="text-slate-400 font-normal text-xs ml-1">({futureBookings.length})</span>
               </h3>
             </div>

             <div className="min-h-[200px]">
               {loading ? (
                 <div className="h-40 flex items-center justify-center"><Loader2 className="animate-spin text-slate-300"/></div>
               ) : futureBookings.length === 0 ? (
                 <div className="text-center py-12"><p className="text-slate-400 text-xs">暂无未来课程安排 ☕️</p></div>
               ) : (
                 <div className="space-y-3 relative pl-4 pb-4">
                   <div className="absolute left-[26px] top-6 bottom-6 w-0.5 bg-slate-200 z-0 rounded-full"></div>
                   
                   {futureBookings.map((b: any) => {
                     const isToday = isSameDay(new Date(b.start_time), new Date());
                     const dateStr = format(new Date(b.start_time), "MMM d", { locale: zhCN });
                     const timeStr = format(new Date(b.start_time), "HH:mm");
                     const student = b.student || {};
                     
                     return (
                       <Link href="/bookings" key={b.id} className="relative z-10 flex gap-4 group active:scale-[0.98] transition-transform duration-200">
                          {/* Date Bubble */}
                          <div className="flex flex-col items-center gap-1 shrink-0 w-14 pt-1">
                             <div className={`h-14 w-14 rounded-2xl flex flex-col items-center justify-center text-xs font-bold shadow-sm z-20 border-[3px] border-slate-50 ${isToday ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'}`}>
                               <span className="text-[10px] leading-tight opacity-80">{dateStr}</span>
                               <span className="text-sm leading-tight">{timeStr}</span>
                             </div>
                          </div>

                          {/* Info Card */}
                          <div className="flex-1 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                               <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center gap-2">
                                    {student.student_code && (
                                      <Badge variant="outline" className="text-[10px] h-5 px-1 bg-slate-50 text-slate-500 font-mono border-slate-200">
                                        {student.student_code}
                                      </Badge>
                                    )}
                                    <h4 className="font-bold text-sm text-slate-900">{student.name}</h4>
                                  </div>
                                  <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                    <Clock className="h-3 w-3" /> {b.duration}h
                                  </div>
                               </div>
                               
                               <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                                    <BookOpen className="h-3.5 w-3.5 text-indigo-400" /> 
                                    {student.subject || "无科目"}
                                  </span>
                                  <span className="h-3 w-px bg-slate-200"></span>
                                  <span className="flex items-center gap-1 truncate">
                                    <User className="h-3.5 w-3.5 text-emerald-500" />
                                    {student.teacher || "无老师"}
                                  </span>
                               </div>

                               <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400 border-t border-slate-50 pt-2 mt-1">
                                  <MapPin className="h-3 w-3" /> {b.location || "线上 (Online)"}
                               </div>
                          </div>
                       </Link>
                     );
                   })}
                 </div>
               )}
             </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:block space-y-6 pt-16">
             <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4">快捷操作</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/bookings/new"><Button className="w-full bg-slate-900 h-12 rounded-xl shadow-lg shadow-slate-200">排课</Button></Link>
                  <Link href="/finance/add"><Button className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl shadow-lg shadow-indigo-100">记账</Button></Link>
                </div>
             </div>
             {!loading && stats.lowBalanceStudents.length > 0 && (
               <div className="bg-white rounded-3xl border border-rose-100 p-6">
                 <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                   <AlertCircle className="h-4 w-4 text-rose-500" /> 待续费学员
                 </h3>
                 <div className="space-y-3">
                    {stats.lowBalanceStudents.map((s: any) => (
                       <Link href={`/students/${s.id}`} key={s.id} className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-lg transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="h-8 w-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">{s.name.charAt(0)}</div>
                             <span className="text-sm text-slate-600 font-bold group-hover:text-indigo-600">{s.name}</span>
                          </div>
                          <span className="text-xs text-rose-500 font-mono font-bold bg-rose-50 px-2 py-1 rounded">{Number(s.balance)}h</span>
                       </Link>
                    ))}
                 </div>
               </div>
             )}
          </div>
        </div>

        {/* --- PART 3: MOBILE DOCK --- */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/60 pb-safe pt-1 px-6 z-50">
          <div className="flex justify-between items-center">
            {/* 首页 */}
            <TabItem href="/" icon={HomeIcon} label="首页" isActive={true} />
            
            {/* 学生 */}
            <TabItem href="/students" icon={Users} label="学生" isActive={false} />
            
            {/* 记一笔 (FAB) */}
            <Link href="/finance/add" className="active:scale-90 transition-transform -mt-8">
               <div className="h-14 w-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-400/50 border-4 border-slate-50">
                 <PenLine className="h-6 w-6" />
               </div>
            </Link>
            
            {/* 排课 */}
            <TabItem href="/bookings" icon={CalendarIcon} label="排课" isActive={false} />
            
            {/* 报表 */}
            <TabItem href="/finance" icon={FileBarChart} label="报表" isActive={false} />
          </div>
        </div>

      </main>
    </>
  );
}