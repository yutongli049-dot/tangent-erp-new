"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format, eachDayOfInterval, subDays } from "date-fns";

// 1. 创建流水 (保持不变)
export async function createTransaction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登录" };

  const type = formData.get("type");
  const amount = formData.get("amount");
  const category = formData.get("category");
  const description = formData.get("description");
  const date = formData.get("date") as string;
  const businessId = formData.get("businessId");
  const proofUrl = formData.get("proofUrl") as string;

  const { error } = await supabase.from("transactions").insert({
    type,
    amount: Number(amount),
    category,
    description,
    transaction_date: date,
    business_unit_id: businessId,
    proof_img_url: proofUrl,
    created_by: user.id, 
  });

  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

// 2. 删除流水 (保持不变)
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

// 3. 编辑流水 (保持不变)
export async function updateTransaction(
  id: string, 
  data: { amount: number; category: string; description: string; date: string; type: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登录" };

  const { error } = await supabase
    .from("transactions")
    .update({
      amount: data.amount,
      category: data.category,
      description: data.description,
      transaction_date: data.date,
      type: data.type
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

// 4. ✅ 获取概览 (核心逻辑合并)
// 前端调用时请传: getFinanceStats(currentBusinessId, range)
export async function getFinanceStats(businessId: string, range: string) {
  const supabase = await createClient();
  const now = new Date();
  
  let startDate = new Date();
  let endDate = new Date();

  // 日期范围逻辑 (你的逻辑很棒，保留)
  switch (range) {
    case "week": 
      startDate = startOfWeek(now, { weekStartsOn: 1 }); 
      endDate = endOfWeek(now, { weekStartsOn: 1 }); 
      break;
    case "month": 
      startDate = startOfMonth(now); 
      endDate = endOfMonth(now); 
      break;
    case "prev_month": // 修正：前端传的是 prev_month
      const prev = subMonths(now, 1);
      startDate = startOfMonth(prev); 
      endDate = endOfMonth(prev); 
      break;
    case "3months": 
      startDate = startOfMonth(subMonths(now, 2)); 
      endDate = endOfMonth(now); 
      break;
    case "6months": 
      startDate = startOfMonth(subMonths(now, 5)); 
      endDate = endOfMonth(now); 
      break;
    case "year": 
      startDate = startOfYear(now); 
      endDate = endOfYear(now); 
      break;
    default: 
      startDate = startOfMonth(now); 
      endDate = endOfMonth(now);
  }

  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  // 并行查询
  const [transactionsRes, bookingsRes, studentsRes] = await Promise.all([
    supabase.from("transactions")
      .select("*")
      .eq("business_unit_id", businessId)
      .gte("transaction_date", startStr)
      .lte("transaction_date", endStr)
      .order("transaction_date", { ascending: false }),
    
    supabase.from("bookings")
      .select(`start_time, duration, student:students(hourly_rate)`)
      .eq("business_unit_id", businessId)
      .eq("status", "completed")
      .gte("start_time", startStr)
      .lte("start_time", endStr),
    
    supabase.from("students")
      .select("balance, hourly_rate")
      .eq("business_unit_id", businessId)
  ]);

  const transactions = transactionsRes.data || [];
  const bookings = bookingsRes.data || [];
  
  // A. 计算总数 (Cards Data)
  let income = 0;
  let expense = 0;
  let realized = 0;

  transactions.forEach(t => {
    if (t.type === 'income') income += Number(t.amount);
    else expense += Number(t.amount);
  });

  bookings.forEach((b: any) => {
    const rate = b.student?.hourly_rate || 70; // 默认费率兜底
    realized += (b.duration * rate);
  });

  // B. 生成图表数据 (Chart Data)
  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
  
  const chartData = daysInterval.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd'); // 用于比对
    
    let dailyIncome = 0;
    let dailyExpense = 0;
    
    // 聚合流水
    transactions.forEach(t => {
      if (t.transaction_date.startsWith(dateStr)) {
        if (t.type === 'income') dailyIncome += Number(t.amount);
        else dailyExpense += Number(t.amount);
      }
    });

    // 聚合消课
    let dailyRealized = 0;
    bookings.forEach((b: any) => {
      // 这里的 start_time 是 UTC ISO，需要简单处理一下时区，或者直接比对前10位
      if (b.start_time.startsWith(dateStr)) {
        dailyRealized += (b.duration * (b.student?.hourly_rate || 70));
      }
    });

    return {
      // 格式化 X 轴标签：如果是本周/本月，只显示 "12" (日)；如果是跨月，显示 "02-12"
      date: format(day, range === 'year' || range === '3months' || range === '6months' ? 'MM-dd' : 'dd'),
      fullDate: dateStr,
      income: dailyIncome,
      expense: dailyExpense,
      realized: dailyRealized,
      net: dailyIncome - dailyExpense
    };
  });

  return {
    income,
    expense,
    net: income - expense,
    realized,
    transactions,
    chartData
  };
}