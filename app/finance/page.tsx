"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useBusiness } from "@/contexts/BusinessContext";
import { getFinanceStats, deleteTransaction, updateTransaction } from "./actions"; // ✅ 引入 updateTransaction
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // ✅ 新增
import { Label } from "@/components/ui/label"; // ✅ 新增
import { Textarea } from "@/components/ui/textarea"; // ✅ 新增
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // ✅ 新增
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // ✅ 新增
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Loader2, Plus, DollarSign, Calendar as CalendarIcon,
  Home as HomeIcon, Users, FileBarChart, PenLine, MoreVertical, Trash2, Pencil
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format } from "date-fns";
import { toast } from "sonner";

export default function FinancePage() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month"); 
  const [data, setData] = useState<any>({
    income: 0, expense: 0, net: 0, realized: 0,
    transactions: [], chartData: []
  });

  // --- 编辑状态管理 ---
  const [editingTx, setEditingTx] = useState<any>(null); // 当前正在编辑的流水
  const [editLoading, setEditLoading] = useState(false);
  // 编辑表单字段
  const [editForm, setEditForm] = useState({
    amount: "",
    category: "",
    date: "",
    description: "",
    type: "expense"
  });

  // 分类选项 (与 Add Page 保持一致)
  const categories = {
    income: [
      { value: "Tuition", label: "🎓 课程收入" },
      { value: "Services", label: "🛠️ 其他服务" },
      { value: "Investment", label: "📈 投资收益" },
    ],
    expense: [
      { value: "Wages", label: "👨‍🏫 员工工资" },
      { value: "Rent", label: "🏠 场地租金" },
      { value: "Software", label: "💻 软件订阅" },
      { value: "Marketing", label: "📣 市场推广" },
      { value: "Reimbursement", label: "🧾 报销" },
      { value: "Other", label: "📦 其他支出" },
    ]
  };

  // 加载数据
  async function loadData() {
    if (!currentBusinessId) return;
    setLoading(true);
    try {
      const res = await getFinanceStats(currentBusinessId, range);
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    loadData();
  }, [range, currentBusinessId]);

  // 删除流水
  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条流水吗？")) return;
    const res = await deleteTransaction(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success("删除成功");
      loadData(); // 刷新数据
    }
  };

  // 打开编辑弹窗
  const openEdit = (tx: any) => {
    setEditingTx(tx);
    // 初始化表单
    setEditForm({
      amount: String(tx.amount),
      category: tx.category || "",
      date: tx.transaction_date.split('T')[0], // 提取 YYYY-MM-DD
      description: tx.description || "",
      type: tx.type
    });
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setEditLoading(true);

    const res = await updateTransaction(editingTx.id, {
      amount: Number(editForm.amount),
      category: editForm.category,
      description: editForm.description,
      date: editForm.date,
      type: editForm.type
    });

    setEditLoading(false);

    if (res?.error) {
      toast.error("更新失败: " + res.error);
    } else {
      toast.success("流水已更新");
      setEditingTx(null); // 关闭弹窗
      loadData(); // 刷新列表
    }
  };

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
    <div className="min-h-screen bg-slate-50 pb-24 md:pb-10 font-sans text-slate-900">
      <div className="hidden md:block"><Navbar /></div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
        
        {/* Header & Controls */}
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
          
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
            {[
              { id: 'week', label: '本周' },
              { id: 'month', label: '本月' },
              { id: 'prev_month', label: '上月' },
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

        {/* Stats Cards */}
        <div className="flex overflow-x-auto gap-4 pb-4 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-6 no-scrollbar snap-x snap-mandatory">
          {/* ... Cards code remains same ... */}
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-emerald-100 bg-emerald-50/50 shadow-sm flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div><p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">现金收入 (In)</p><h2 className="text-3xl font-black text-slate-900 mt-2">${data.income.toLocaleString()}</h2></div>
               <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><ArrowDownRight className="h-5 w-5" /></div>
             </div>
          </Card>
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-rose-100 bg-rose-50/50 shadow-sm flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div><p className="text-xs font-bold text-rose-600 uppercase tracking-wider">现金支出 (Out)</p><h2 className="text-3xl font-black text-slate-900 mt-2">${data.expense.toLocaleString()}</h2></div>
               <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600"><ArrowUpRight className="h-5 w-5" /></div>
             </div>
          </Card>
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-indigo-100 bg-indigo-50/50 shadow-sm flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div><p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">净现金流 (Net)</p><h2 className={`text-3xl font-black mt-2 ${data.net >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>{data.net >= 0 ? '+' : ''}${data.net.toLocaleString()}</h2></div>
               <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Wallet className="h-5 w-5" /></div>
             </div>
          </Card>
          <Card className="snap-center min-w-[85vw] md:min-w-0 p-5 border-amber-100 bg-amber-50/50 shadow-sm flex flex-col justify-between h-32 md:h-auto">
             <div className="flex justify-between items-start">
               <div><p className="text-xs font-bold text-amber-600 uppercase tracking-wider">消课产值 (Realized)</p><h2 className="text-3xl font-black text-slate-900 mt-2">${data.realized.toLocaleString()}</h2></div>
               <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><TrendingUp className="h-5 w-5" /></div>
             </div>
          </Card>
        </div>

        {/* Chart */}
        <div className="mt-6 md:mt-8">
          <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <FileBarChart className="h-4 w-4 text-slate-400" /> 趋势分析 (Trend)
          </h3>
          <Card className="p-4 md:p-6 border-slate-200 shadow-sm overflow-hidden bg-white">
            <div className="overflow-x-auto no-scrollbar w-full pb-2">
               <div className="h-[250px] md:h-[300px] min-w-[600px] md:min-w-full">
                 {loading ? (
                   <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-slate-300"/></div>
                 ) : (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={data.chartData} barGap={0} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} dy={10} />
                       <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                       <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                       <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}/>
                       <Bar dataKey="income" name="收入 In" fill="#10b981" radius={[4, 4, 0, 0]} barSize={range === 'week' ? 20 : 8} />
                       <Bar dataKey="expense" name="支出 Out" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={range === 'week' ? 20 : 8} />
                       <Bar dataKey="realized" name="产值 Realized" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={range === 'week' ? 20 : 8} />
                     </BarChart>
                   </ResponsiveContainer>
                 )}
               </div>
            </div>
          </Card>
        </div>

        {/* Transactions List */}
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
                    <div className="flex items-center gap-3">
                      <div className={`text-base font-black font-mono whitespace-nowrap ${
                        t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'
                      }`}>
                        {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString()}
                      </div>
                      
                      {/* 操作菜单 */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-slate-600">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {/* ✅ 1. 新增：编辑按钮 */}
                          <DropdownMenuItem onClick={() => openEdit(t)}>
                            <Pencil className="mr-2 h-4 w-4" /> 编辑记录
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> 删除记录
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                 </div>
               ))
             )}
           </div>
        </div>

        {/* ✅ 2. 新增：编辑流水弹窗 */}
        <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>编辑流水</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-2">
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">类型</Label>
                 <Select value={editForm.type} onValueChange={(val) => setEditForm({...editForm, type: val})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">支出</SelectItem>
                      <SelectItem value="income">收入</SelectItem>
                    </SelectContent>
                 </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">金额</Label>
                 <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} className="col-span-3" />
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">分类</Label>
                 <Select value={editForm.category} onValueChange={(val) => setEditForm({...editForm, category: val})}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="分类" />
                    </SelectTrigger>
                    <SelectContent>
                      {(editForm.type === 'income' ? categories.income : categories.expense).map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                 </Select>
               </div>
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label className="text-right">日期</Label>
                 <Input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} className="col-span-3" />
               </div>
               <div className="grid grid-cols-4 items-start gap-4">
                 <Label className="text-right mt-2">备注</Label>
                 <Textarea value={editForm.description} onChange={(e) => setEditForm({...editForm, description: e.target.value})} className="col-span-3 h-20" />
               </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaveEdit} disabled={editLoading}>
                {editLoading ? <Loader2 className="animate-spin" /> : "保存修改"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
      
      {/* Mobile Dock */}
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