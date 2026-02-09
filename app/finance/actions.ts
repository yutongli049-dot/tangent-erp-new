"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format, eachDayOfInterval, isSameDay, subDays } from "date-fns";

export async function createTransaction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const type = formData.get("type");
  const amount = formData.get("amount");
  const category = formData.get("category");
  const description = formData.get("description");
  const date = formData.get("date");
  const businessId = formData.get("businessId");

  const { error } = await supabase.from("transactions").insert({
    type,
    amount: Number(amount),
    category,
    description,
    transaction_date: date,
    business_unit_id: businessId,
  });

  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

// ✅ 核心新增：获取财务概览数据
export async function getFinanceOverview(businessId: string, range: string) {
  const supabase = await createClient();
  const now = new Date();
  
  let startDate = new Date();
  let endDate = new Date();

  // 1. 计算时间范围
  switch (range) {
    case "week":
      startDate = startOfWeek(now, { weekStartsOn: 1 }); // 周一为第一天
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      break;
    case "month":
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      break;
    case "3months":
      startDate = subMonths(now, 2); // 当前月 + 前两个月
      startDate = startOfMonth(startDate);
      endDate = endOfMonth(now);
      break;
    case "6months":
      startDate = subMonths(now, 5);
      startDate = startOfMonth(startDate);
      endDate = endOfMonth(now);
      break;
    case "year":
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      break;
    default: // 默认本月
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
  }

  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  // 2. 并行查询三组数据
  const [transactionsRes, bookingsRes, studentsRes] = await Promise.all([
    // A. 查流水 (收入/支出)
    supabase
      .from("transactions")
      .select("*")
      .eq("business_unit_id", businessId)
      .gte("transaction_date", startStr)
      .lte("transaction_date", endStr)
      .order("transaction_date", { ascending: false }),
    
    // B. 查消课 (已完成的课程)
    supabase
      .from("bookings")
      .select(`start_time, duration, student:students(hourly_rate)`)
      .eq("business_unit_id", businessId)
      .eq("status", "completed") // 只算已完成
      .gte("start_time", startStr)
      .lte("start_time", endStr),

    // C. 查当前资金池 (待消课 - 这是一个快照，不随时间范围变化)
    supabase
      .from("students")
      .select("balance, hourly_rate")
      .eq("business_unit_id", businessId)
  ]);

  const transactions = transactionsRes.data || [];
  const bookings = bookingsRes.data || [];
  const students = studentsRes.data || [];

  // 3. 计算汇总指标
  let totalIncome = 0;
  let totalExpense = 0;
  let totalRealized = 0; // 消课产值

  transactions.forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);
  });

  bookings.forEach((b: any) => {
    const rate = b.student?.hourly_rate || 0;
    totalRealized += (b.duration * rate);
  });

  // 待消课资金池 (所有学生余额 * 费率)
  const totalUnearned = students.reduce((sum, s) => sum + (Number(s.balance) * Number(s.hourly_rate || 0)), 0);

  // 4. 生成图表数据 (按天聚合)
  // 生成日期序列
  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
  
  // 如果时间跨度太大(比如年)，按天显示太密，可以优化为按月，但为了MVP简单，先按天
  const chartData = daysInterval.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    
    // 当日流水
    let dailyIncome = 0;
    let dailyExpense = 0;
    transactions.forEach(t => {
      if (t.transaction_date.startsWith(dateStr)) {
        if (t.type === 'income') dailyIncome += Number(t.amount);
        else dailyExpense += Number(t.amount);
      }
    });

    // 当日消课
    let dailyRealized = 0;
    bookings.forEach((b: any) => {
      if (b.start_time.startsWith(dateStr)) { // 简单字符串匹配 UTC 可能有时区偏差，但通常足够精确到天
        dailyRealized += (b.duration * (b.student?.hourly_rate || 0));
      }
    });

    return {
      date: format(day, range === 'year' || range === '6months' ? 'MM-dd' : 'dd'), // 跨度大显示月日，跨度小显示日
      fullDate: dateStr,
      income: dailyIncome,
      expense: dailyExpense,
      realized: dailyRealized,
      net: dailyIncome - dailyExpense
    };
  });

  return {
    summary: {
      totalIncome,
      totalExpense,
      netIncome: totalIncome - totalExpense,
      totalRealized,
      totalUnearned
    },
    chartData,
    transactions // 返回给列表显示
  };
}