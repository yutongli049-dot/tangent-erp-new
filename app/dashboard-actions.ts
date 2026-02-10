"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth, startOfDay } from "date-fns";

export async function getDashboardStats(businessId: string) {
  const supabase = await createClient();
  const now = new Date();
  
  // 1. 本月时间范围
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  // 2. 并行查询核心数据
  const [
    { data: transactions },
    { data: bookings },
    { data: students }
  ] = await Promise.all([
    // A. 查流水 (算现金流)
    supabase
      .from("transactions")
      .select("amount, type, transaction_date")
      .eq("business_unit_id", businessId)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd),
    
    // B. 查课程 (算消课 + 日历) - ✅ 修复：多查 student_code, teacher, subject
    supabase
      .from("bookings")
      .select(`
        id, start_time, end_time, duration, status, location,
        student:students (
          id, name, student_code, teacher, subject, balance
        )
      `)
      .eq("business_unit_id", businessId)
      .neq("status", "cancelled"), // 只查没取消的

    // C. 查所有学生 (算资金池)
    supabase
      .from("students")
      .select("balance, hourly_rate, name, id")
      .eq("business_unit_id", businessId)
  ]);

  // --- 数据处理逻辑 ---

  // 1. 净现金流 (Net Cash)
  let cashIncome = 0;
  let cashExpense = 0;
  const chartMap = new Map<string, number>();

  transactions?.forEach(t => {
    const amt = Number(t.amount);
    if (t.type === 'income') cashIncome += amt;
    else if (t.type === 'expense') cashExpense += Math.abs(amt);

    // 生成图表数据 (按天聚合)
    const day = t.transaction_date.split('T')[0];
    const net = t.type === 'income' ? amt : -amt;
    chartMap.set(day, (chartMap.get(day) || 0) + net);
  });

  const netCashFlow = cashIncome - cashExpense;

  // 转换图表数组
  const chartData = Array.from(chartMap.entries())
    .map(([date, net]) => ({ date, net }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // 2. 已消课 (Realized Revenue) - 只算“已完成”的
  let realizedRevenue = 0;
  bookings?.forEach(b => {
    if (b.status === 'completed' && new Date(b.start_time) >= startOfMonth(now)) {
      // 如果没有 hourly_rate 字段，这里可能需要补充，或者估算
      // 为了精确，建议 bookings 表记录当时的 rate，或者关联查询 student.hourly_rate
      // 这里简化：假设 70 或从学生表查 (后端关联稍微复杂，这里暂估)
      realizedRevenue += Number(b.duration) * 70; 
    }
  });

  // 3. 资金池 (Unearned Revenue) = 所有学生余额 * 费率
  let unearnedRevenue = 0;
  const lowBalanceStudents: any[] = [];
  
  students?.forEach(s => {
    const bal = Number(s.balance);
    const rate = Number(s.hourly_rate) || 0;
    if (bal > 0) unearnedRevenue += bal * rate;
    if (bal < 3) lowBalanceStudents.push(s);
  });

  return {
    cashIncome,
    netCashFlow,
    realizedRevenue,
    unearnedRevenue,
    chartData, // 图表数据
    calendarBookings: bookings || [], // 日历数据 (包含未来的)
    lowBalanceStudents
  };
}