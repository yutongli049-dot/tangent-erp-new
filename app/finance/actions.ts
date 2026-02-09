"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format, eachDayOfInterval } from "date-fns";

// 1. 创建流水
export async function createTransaction(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登录" };

  const type = formData.get("type");
  const amount = formData.get("amount");
  const category = formData.get("category");
  const description = formData.get("description");
  const date = formData.get("date");
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

// 2. 删除流水
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

// 3. ✅ 新增：编辑流水
export async function updateTransaction(
  id: string, 
  data: { 
    amount: number; 
    category: string; 
    description: string; 
    date: string; 
    type: string 
  }
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

// 4. 获取概览 (保持不变)
export async function getFinanceOverview(businessId: string, range: string) {
  const supabase = await createClient();
  const now = new Date();
  
  let startDate = new Date();
  let endDate = new Date();

  switch (range) {
    case "week": startDate = startOfWeek(now, { weekStartsOn: 1 }); endDate = endOfWeek(now, { weekStartsOn: 1 }); break;
    case "month": startDate = startOfMonth(now); endDate = endOfMonth(now); break;
    case "3months": startDate = subMonths(now, 2); startDate = startOfMonth(startDate); endDate = endOfMonth(now); break;
    case "6months": startDate = subMonths(now, 5); startDate = startOfMonth(startDate); endDate = endOfMonth(now); break;
    case "year": startDate = startOfYear(now); endDate = endOfYear(now); break;
    default: startDate = startOfMonth(now); endDate = endOfMonth(now);
  }

  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  const [transactionsRes, bookingsRes, studentsRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("business_unit_id", businessId).gte("transaction_date", startStr).lte("transaction_date", endStr).order("transaction_date", { ascending: false }),
    supabase.from("bookings").select(`start_time, duration, student:students(hourly_rate)`).eq("business_unit_id", businessId).eq("status", "completed").gte("start_time", startStr).lte("start_time", endStr),
    supabase.from("students").select("balance, hourly_rate").eq("business_unit_id", businessId)
  ]);

  const transactions = transactionsRes.data || [];
  const bookings = bookingsRes.data || [];
  const students = studentsRes.data || [];

  let totalIncome = 0;
  let totalExpense = 0;
  let totalRealized = 0;

  transactions.forEach(t => {
    if (t.type === 'income') totalIncome += Number(t.amount);
    else totalExpense += Number(t.amount);
  });

  bookings.forEach((b: any) => {
    const rate = b.student?.hourly_rate || 0;
    totalRealized += (b.duration * rate);
  });

  const totalUnearned = students.reduce((sum, s) => sum + (Number(s.balance) * Number(s.hourly_rate || 0)), 0);

  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
  const chartData = daysInterval.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    let dailyIncome = 0;
    let dailyExpense = 0;
    transactions.forEach(t => {
      if (t.transaction_date.startsWith(dateStr)) {
        if (t.type === 'income') dailyIncome += Number(t.amount);
        else dailyExpense += Number(t.amount);
      }
    });

    let dailyRealized = 0;
    bookings.forEach((b: any) => {
      if (b.start_time.startsWith(dateStr)) {
        dailyRealized += (b.duration * (b.student?.hourly_rate || 0));
      }
    });

    return {
      date: format(day, range === 'year' || range === '6months' ? 'MM-dd' : 'dd'),
      fullDate: dateStr,
      income: dailyIncome,
      expense: dailyExpense,
      realized: dailyRealized,
      net: dailyIncome - dailyExpense
    };
  });

  return {
    summary: { totalIncome, totalExpense, netIncome: totalIncome - totalExpense, totalRealized, totalUnearned },
    chartData,
    transactions
  };
}