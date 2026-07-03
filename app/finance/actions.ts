"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, format, eachDayOfInterval } from "date-fns";

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
  
  const studentId = formData.get("studentId") as string;
  const hoursToAdd = Number(formData.get("hoursToAdd"));

  const { error: txError } = await supabase.from("transactions").insert({
    type,
    amount: Number(amount),
    category,
    description,
    transaction_date: date,
    business_unit_id: businessId,
    proof_img_url: proofUrl,
    created_by: user.id,
    student_id: studentId || null, 
    quantity: hoursToAdd > 0 ? hoursToAdd : null 
  });

  if (txError) return { error: txError.message };

  // 自动充值逻辑
  if (studentId && hoursToAdd > 0 && type === 'income') {
    const { data: student } = await supabase.from("students").select("balance").eq("id", studentId).single();
    if (student) {
      await supabase.from("students").update({ balance: Number(student.balance) + hoursToAdd }).eq("id", studentId);
    }
  }

  revalidatePath("/finance");
  revalidatePath("/");
  revalidatePath("/students");
  return { success: true };
}

// 2. ✅ 升级：删除流水 (带回滚逻辑)
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  
  // A. 删除前先查询：这条流水是否关联了学生充值？
  const { data: tx } = await supabase
    .from("transactions")
    .select("student_id, quantity, type, category")
    .eq("id", id)
    .single();

  // B. 如果是“充值流水”，则需要把充进去的课时“扣回来”
  // 条件：关联了学生 + 有数量 + 是收入 + 分类是学费
  if (tx && tx.student_id && tx.quantity && tx.quantity > 0 && tx.type === 'income') {
    // 查当前余额
    const { data: student } = await supabase
      .from("students")
      .select("balance")
      .eq("id", tx.student_id)
      .single();
    
    if (student) {
      const newBalance = Number(student.balance) - Number(tx.quantity);
      // 执行回滚扣费
      await supabase
        .from("students")
        .update({ balance: newBalance })
        .eq("id", tx.student_id);
    }
  }

  // C. 无论是否回滚，最后都物理删除这条流水
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  
  if (error) return { error: error.message };
  
  revalidatePath("/finance");
  revalidatePath("/students"); // 刷新学生页面的余额
  revalidatePath("/");
  return { success: true };
}

// 3. 编辑流水 (保持不变)
export async function updateTransaction(
  id: string, 
  data: { amount: number; category: string; description: string; date: string; type: string }
) {
  const supabase = await createClient();
  // 注意：目前编辑流水不涉及“修改关联课时”，因为逻辑太复杂容易出错。
  // 建议用户如果填错了课时，直接删除重记，这样会触发上面的回滚逻辑，更安全。
  
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