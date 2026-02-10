"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format, eachDayOfInterval } from "date-fns";

// 1. ✅ 升级：创建流水 (支持关联学生 + 充值)
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
  
  // 新增字段
  const studentId = formData.get("studentId") as string;
  const hoursToAdd = Number(formData.get("hoursToAdd"));

  // A. 插入流水
  const { error: txError } = await supabase.from("transactions").insert({
    type,
    amount: Number(amount),
    category,
    description,
    transaction_date: date,
    business_unit_id: businessId,
    proof_img_url: proofUrl,
    created_by: user.id,
    // 如果选了学生，关联上去
    student_id: studentId || null, 
    // 如果填了课时，记录数量 (方便以后查账知道这笔钱买了几个课时)
    quantity: hoursToAdd > 0 ? hoursToAdd : null 
  });

  if (txError) return { error: txError.message };

  // B. ✅ 核心逻辑：如果关联了学生且输入了课时，自动充值
  if (studentId && hoursToAdd > 0 && type === 'income') {
    // 1. 查当前余额
    const { data: student } = await supabase
      .from("students")
      .select("balance")
      .eq("id", studentId)
      .single();
    
    if (student) {
      const newBalance = Number(student.balance) + hoursToAdd;
      // 2. 更新余额
      await supabase
        .from("students")
        .update({ balance: newBalance })
        .eq("id", studentId);
    }
  }

  revalidatePath("/finance");
  revalidatePath("/");
  revalidatePath("/students"); // 顺便刷新学生列表
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

// 4. 获取概览 (保持不变)
export async function getFinanceStats(businessId: string, range: string) {
  const supabase = await createClient();
  const now = new Date();
  
  let startDate = new Date();
  let endDate = new Date();

  switch (range) {
    case "week": startDate = startOfWeek(now, { weekStartsOn: 1 }); endDate = endOfWeek(now, { weekStartsOn: 1 }); break;
    case "month": startDate = startOfMonth(now); endDate = endOfMonth(now); break;
    case "prev_month": const prev = subMonths(now, 1); startDate = startOfMonth(prev); endDate = endOfMonth(prev); break;
    case "3months": startDate = startOfMonth(subMonths(now, 2)); endDate = endOfMonth(now); break;
    case "year": startDate = startOfYear(now); endDate = endOfYear(now); break;
    default: startDate = startOfMonth(now); endDate = endOfMonth(now);
  }

  const startStr = startDate.toISOString();
  const endStr = endDate.toISOString();

  const [transactionsRes, bookingsRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("business_unit_id", businessId).gte("transaction_date", startStr).lte("transaction_date", endStr).order("transaction_date", { ascending: false }),
    supabase.from("bookings").select(`start_time, duration, student:students(hourly_rate)`).eq("business_unit_id", businessId).eq("status", "completed").gte("start_time", startStr).lte("start_time", endStr),
  ]);

  const transactions = transactionsRes.data || [];
  const bookings = bookingsRes.data || [];
  
  let income = 0;
  let expense = 0;
  let realized = 0;

  transactions.forEach(t => {
    if (t.type === 'income') income += Number(t.amount);
    else expense += Number(t.amount);
  });

  bookings.forEach((b: any) => {
    const rate = b.student?.hourly_rate || 70; 
    realized += (b.duration * rate);
  });

  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
  const chartData = daysInterval.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    let dailyIncome = 0;
    let dailyExpense = 0;
    let dailyRealized = 0;

    transactions.forEach(t => {
      if (t.transaction_date.startsWith(dateStr)) {
        if (t.type === 'income') dailyIncome += Number(t.amount);
        else dailyExpense += Number(t.amount);
      }
    });

    bookings.forEach((b: any) => {
      if (b.start_time.startsWith(dateStr)) {
        dailyRealized += (b.duration * (b.student?.hourly_rate || 70));
      }
    });

    return {
      date: format(day, ['year', '3months'].includes(range) ? 'MM-dd' : 'dd'),
      fullDate: dateStr,
      income: dailyIncome,
      expense: dailyExpense,
      realized: dailyRealized,
      net: dailyIncome - dailyExpense
    };
  });

  return { income, expense, net: income - expense, realized, transactions, chartData };
}