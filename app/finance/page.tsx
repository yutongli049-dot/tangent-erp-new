"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useBusiness } from "@/contexts/BusinessContext";
import { getFinanceOverview, deleteTransaction, updateTransaction } from "./actions"; // ✅ 引入 update
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, ArrowLeft, TrendingUp, TrendingDown, 
  DollarSign, PiggyBank, Activity, Trash2, Loader2, Calendar, Pencil
} from "lucide-react";
import { 
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

export default function FinancePage() {
  const { currentBusinessId } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("month");
  const [data, setData] = useState<any>({
    summary: { totalIncome: 0, totalExpense: 0, netIncome: 0, totalRealized: 0, totalUnearned: 0 },
    chartData: [],
    transactions: []
  });

  // 编辑弹窗状态
  const [editingTx, setEditingTx] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);

  // 监听数据
  useEffect(() => {
    async function fetchData() {
      if (!currentBusinessId) return;
      setLoading(true);
      try {
        const res = await getFinanceOverview(currentBusinessId, range);
        setData(res);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, [currentBusinessId, range]);

  const handleDelete = async (id: string) => {
    if (!confirm("确认删除这条记录？")) return;
    await deleteTransaction(id);
    const res = await getFinanceOverview(currentBusinessId, range);
    setData(res);
  };

  // ✅ 处理编辑保存
  const handleSaveEdit = async () => {
    if (!editingTx) return;
    setEditLoading(true);
    await updateTransaction(editingTx.id, {
      amount: Number(editingTx.amount),
      category: editingTx.category,
      description: editingTx.description,
      date: editingTx.transaction_date,
      type: editingTx.type
    });
    setEditLoading(false);
    setEditingTx(null); // 关闭弹窗
    
    // 刷新页面
    const res = await getFinanceOverview(currentBusinessId, range);
    setData(res);
  };

  const incomeCategories = [
    { value: "Tuition", label: "🎓 课程收入 (Tuition)" },
    { value: "Services", label: "🛠️ 其他服务 (Other Services)" },
  ];
  const expenseCategories = [
    { value: "Wages", label: "👨‍🏫 员工工资 (Wages)" },
    { value: "Reimbursement", label: "🧾 报销支出 (Reimbursement)" },
    { value: "Other", label: "📦 其他支出 (Other Expenses)" },
  ];

  return (
    <main className="min-h-screen bg-slate-50/50 pb-10">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5 text-slate-500" /></Button>
          </Link>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-indigo-600" /> 财务驾驶舱
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/finance/add">
            <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm gap-2">
              <Plus className="h-4 w-4" /> 记一笔
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Filter Tabs */}
        <div className="flex justify-center">
          <Tabs defaultValue="month" value={range} onValueChange={setRange} className="w-full max-w-2xl">
            <TabsList className="grid w-full grid-cols-5 bg-white border border-slate-200 shadow-sm h-11 p-1">
              <TabsTrigger value="week">本周</TabsTrigger>
              <TabsTrigger value="month">本月</TabsTrigger>
              <TabsTrigger value="3months">近3月</TabsTrigger>
              <TabsTrigger value="6months">半年</TabsTrigger>
              <TabsTrigger value="year">全年</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* KPI Cards (保持不变) */}
        {loading ? (
          <div className="h-32 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="border-emerald-100 bg-emerald-50/30">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-emerald-600 uppercase flex items-center gap-1"><TrendingUp className="h-3 w-3" /> 现金收入 (Income)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">${data.summary.totalIncome.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-rose-100 bg-rose-50/30">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-rose-600 uppercase flex items-center gap-1"><TrendingDown className="h-3 w-3" /> 现金支出 (Expense)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">${data.summary.totalExpense.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-indigo-100 bg-white">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-indigo-600 uppercase">净现金流 (Net)</p>
                <p className={`text-2xl font-bold mt-1 ${data.summary.netIncome >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                  {data.summary.netIncome >= 0 ? '+' : ''}${data.summary.netIncome.toLocaleString()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-amber-100 bg-amber-50/30">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-amber-600 uppercase flex items-center gap-1"><Activity className="h-3 w-3" /> 已消课产值 (Realized)</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">${data.summary.totalRealized.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><PiggyBank className="h-3 w-3" /> 待消课资金池 (Pool)</p>
                <p className="text-2xl font-bold text-slate-700 mt-1">${data.summary.totalUnearned.toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Chart (保持不变) */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader><CardTitle className="text-base font-bold text-slate-800">财务趋势分析</CardTitle></CardHeader>
          <CardContent className="h-[400px] w-full">
            {loading ? <div className="h-full flex justify-center items-center"><Loader2 className="animate-spin text-slate-300"/></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} cursor={{fill: '#f8fafc'}} />
                  <Legend verticalAlign="top" height={36} iconType="circle"/>
                  <Bar name="现金收入 (In)" dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} stackId="a" />
                  <Bar name="现金支出 (Out)" dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} stackId="a" />
                  <Line type="monotone" name="消课产值 (Realized)" dataKey="realized" stroke="#f59e0b" strokeWidth={3} dot={{fill: '#f59e0b', strokeWidth: 0, r: 3}} activeDot={{r: 6}} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-50">
            <CardTitle className="text-base font-bold text-slate-800">流水明细 (Transactions)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="animate-spin inline-block text-slate-300"/></div>
            ) : data.transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">此时间段无记录</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.transactions.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {t.type === 'income' ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{t.category || "未分类"}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <Calendar className="h-3 w-3" /> {t.transaction_date}
                          {t.description && <span className="text-slate-400">| {t.description}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-base font-bold tabular-nums mr-4 ${t.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                        {t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString()}
                      </span>
                      
                      {/* ✅ 编辑按钮 */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-indigo-600" onClick={() => setEditingTx(t)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      
                      {/* 删除按钮 */}
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleDelete(t.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ✅ 编辑弹窗 (Edit Dialog) */}
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>编辑流水明细</DialogTitle>
          </DialogHeader>
          {editingTx && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">类型</Label>
                <div className="col-span-3 flex gap-2">
                   <Button size="sm" variant={editingTx.type === 'income' ? 'default' : 'outline'} onClick={() => setEditingTx({...editingTx, type: 'income', category: ''})} className={editingTx.type === 'income' ? 'bg-emerald-600' : ''}>收入</Button>
                   <Button size="sm" variant={editingTx.type === 'expense' ? 'default' : 'outline'} onClick={() => setEditingTx({...editingTx, type: 'expense', category: ''})} className={editingTx.type === 'expense' ? 'bg-rose-600' : ''}>支出</Button>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">金额</Label>
                <Input type="number" value={editingTx.amount} onChange={(e) => setEditingTx({...editingTx, amount: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">分类</Label>
                <Select value={editingTx.category} onValueChange={(val) => setEditingTx({...editingTx, category: val})}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(editingTx.type === 'income' ? incomeCategories : expenseCategories).map(c => 
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">日期</Label>
                <Input type="date" value={editingTx.transaction_date} onChange={(e) => setEditingTx({...editingTx, transaction_date: e.target.value})} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">备注</Label>
                <Input value={editingTx.description || ""} onChange={(e) => setEditingTx({...editingTx, description: e.target.value})} className="col-span-3" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={handleSaveEdit} disabled={editLoading}>{editLoading ? <Loader2 className="animate-spin" /> : "保存修改"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </main>
  );
}