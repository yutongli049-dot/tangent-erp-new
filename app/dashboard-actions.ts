"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats(businessId: string) {
  const supabase = await createClient();
  const now = new Date();
  
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // 1. 获取本月所有流水
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, type, transaction_date")
    .eq("business_unit_id", businessId)
    .gte("transaction_date", firstDay)
    .lte("transaction_date", lastDay)
    .order("transaction_date");

  // 图表数据处理
  const dailyMap: Record<string, { date: string; income: number; expense: number }> = {};
  let totalCashIncome = 0;
  let totalExpense = 0;

  transactions?.forEach(t => {
    const day = t.transaction_date.split('T')[0];
    const val = Number(t.amount);
    if (!dailyMap[day]) dailyMap[day] = { date: day, income: 0, expense: 0 };
    if (t.type === 'income') {
      totalCashIncome += val;
      dailyMap[day].income += val;
    } else {
      totalExpense += val;
      dailyMap[day].expense += val;
    }
  });

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const chartData = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    chartData.push(dailyMap[dayStr] || { date: dayStr, income: 0, expense: 0 });
  }

  // 2. 核心指标计算
  const { data: completedBookings } = await supabase
    .from("bookings")
    .select(`duration, student:students ( hourly_rate )`)
    .eq("business_unit_id", businessId)
    .eq("status", "completed")
    .gte("start_time", firstDay)
    .lte("start_time", lastDay);

  const realizedRevenue = completedBookings?.reduce((sum, b: any) => sum + (b.duration * (b.student?.hourly_rate || 0)), 0) || 0;

  const { data: allStudents } = await supabase
    .from("students")
    .select("id, name, balance, hourly_rate") // 多查了 id 和 name
    .eq("business_unit_id", businessId);

  const unearnedRevenue = allStudents?.reduce((sum, s) => sum + (Number(s.balance) * Number(s.hourly_rate || 0)), 0) || 0;

  // ✅ 新增：筛选余额不足的学生 (少于 3 课时)
  // 并按余额从低到高排序
  const lowBalanceStudents = allStudents
    ?.filter(s => Number(s.balance) <= 3)
    .sort((a, b) => Number(a.balance) - Number(b.balance)) || [];

  // 3. 日历数据
  const { data: calendarBookings } = await supabase
    .from("bookings")
    .select(`
      id, start_time, end_time, duration, status, location, notes,
      student:students(name, subject)
    `)
    .eq("business_unit_id", businessId)
    .neq("status", "cancelled")
    .gte("start_time", firstDay)
    .lte("start_time", lastDay);

  return {
    cashIncome: totalCashIncome,
    netCashFlow: totalCashIncome - totalExpense,
    realizedRevenue,
    unearnedRevenue,
    chartData,
    calendarBookings: calendarBookings || [],
    lowBalanceStudents, // ✅ 返回给前端
  };
}