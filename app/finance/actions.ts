"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { incrementStudentBalance } from "@/lib/student-balance";
import { startOfWeek, endOfWeek, format, eachDayOfInterval } from "date-fns";
import { aggregateByCurrency, DEFAULT_CURRENCY, normalizeCurrency } from "@/lib/currency";
import { getNzMonthBounds, getTodayInNZ, nzStartOfDayUtc, nzEndOfDayUtc } from "@/lib/timezone";

// 1. 创建流水
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
  const currency = normalizeCurrency(formData.get("currency") as string);
  
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
    quantity: hoursToAdd > 0 ? hoursToAdd : null,
    currency,
  });

  if (txError) return { error: txError.message };

  if (studentId && hoursToAdd > 0 && type === "income") {
    const balanceRes = await incrementStudentBalance(supabase, studentId, hoursToAdd);
    if (balanceRes.error) return { error: balanceRes.error };
  }

  revalidatePath("/finance");
  revalidatePath("/");
  revalidatePath("/students");
  return { success: true };
}

// 2. 删除流水 (带回滚逻辑)
export async function deleteTransaction(id: string) {
  const supabase = await createClient();
  
  const { data: tx } = await supabase
    .from("transactions")
    .select("student_id, quantity, type, category")
    .eq("id", id)
    .single();

  if (tx && tx.student_id && tx.quantity && tx.quantity > 0 && tx.type === "income") {
    const balanceRes = await incrementStudentBalance(
      supabase,
      tx.student_id,
      -Number(tx.quantity)
    );
    if (balanceRes.error) return { error: balanceRes.error };
  }

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  
  if (error) return { error: error.message };
  
  revalidatePath("/finance");
  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}

// 3. 编辑流水
export async function updateTransaction(
  id: string, 
  data: { amount: number; category: string; description: string; date: string; type: string; currency?: string }
) {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from("transactions")
    .update({
      amount: data.amount,
      category: data.category,
      description: data.description,
      transaction_date: data.date,
      type: data.type,
      ...(data.currency ? { currency: normalizeCurrency(data.currency) } : {}),
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}

// 4. 获取概览 — 双币种独立汇总；「本月」与 Dashboard 共用 NZT 月界
export async function getFinanceStats(businessId: string, range: string) {
  const supabase = await createClient();
  const now = new Date();
  let startStr: string;
  let endStr: string;
  let startDate: Date;
  let endDate: Date;

  switch (range) {
    case "week": {
      startDate = startOfWeek(now, { weekStartsOn: 1 });
      endDate = endOfWeek(now, { weekStartsOn: 1 });
      startStr = startDate.toISOString();
      endStr = endDate.toISOString();
      break;
    }
    case "month": {
      const bounds = getNzMonthBounds(0);
      startStr = bounds.startIso;
      endStr = bounds.endIso;
      startDate = new Date(bounds.startIso);
      endDate = new Date(bounds.endIso);
      break;
    }
    case "prev_month": {
      const bounds = getNzMonthBounds(-1);
      startStr = bounds.startIso;
      endStr = bounds.endIso;
      startDate = new Date(bounds.startIso);
      endDate = new Date(bounds.endIso);
      break;
    }
    case "3months": {
      const endBounds = getNzMonthBounds(0);
      const startBounds = getNzMonthBounds(-2);
      startStr = startBounds.startIso;
      endStr = endBounds.endIso;
      startDate = new Date(startBounds.startIso);
      endDate = new Date(endBounds.endIso);
      break;
    }
    case "year": {
      const todayNz = getTodayInNZ();
      const y = todayNz.slice(0, 4);
      startStr = nzStartOfDayUtc(`${y}-01-01`).toISOString();
      endStr = nzEndOfDayUtc(`${y}-12-31`).toISOString();
      startDate = new Date(startStr);
      endDate = new Date(endStr);
      break;
    }
    default: {
      const bounds = getNzMonthBounds(0);
      startStr = bounds.startIso;
      endStr = bounds.endIso;
      startDate = new Date(bounds.startIso);
      endDate = new Date(bounds.endIso);
    }
  }

  const [transactionsRes, bookingsRes] = await Promise.all([
    supabase.from("transactions").select("*").eq("business_unit_id", businessId).gte("transaction_date", startStr).lte("transaction_date", endStr).order("transaction_date", { ascending: false }),
    supabase.from("bookings").select(`start_time, duration, actual_rate, student:students(hourly_rate, currency)`).eq("business_unit_id", businessId).eq("status", "completed").gte("start_time", startStr).lte("start_time", endStr),
  ]);

  const transactions = transactionsRes.data || [];
  const bookings = bookingsRes.data || [];
  
  const byCurrency = aggregateByCurrency(transactions);
  const income = byCurrency.NZD.income;
  const expense = byCurrency.NZD.expense;
  let realized = 0;
  let realizedRmb = 0;

  bookings.forEach((b: any) => {
    const rate = Number(b.actual_rate ?? b.student?.hourly_rate ?? 70);
    const value = Number(b.duration) * rate;
    if (normalizeCurrency(b.student?.currency) === "RMB") realizedRmb += value;
    else realized += value;
  });

  const daysInterval = eachDayOfInterval({ start: startDate, end: endDate });
  const chartData = daysInterval.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    let dailyIncome = 0;
    let dailyExpense = 0;
    let dailyRealized = 0;
    let dailyIncomeRmb = 0;
    let dailyExpenseRmb = 0;

    transactions.forEach(t => {
      if (String(t.transaction_date).startsWith(dateStr)) {
        const cur = normalizeCurrency(t.currency);
        const amt = Number(t.amount);
        if (cur === "RMB") {
          if (t.type === 'income') dailyIncomeRmb += amt;
          else if (t.type === 'expense') dailyExpenseRmb += Math.abs(amt);
        } else {
          if (t.type === 'income') dailyIncome += amt;
          else if (t.type === 'expense') dailyExpense += Math.abs(amt);
        }
      }
    });

    bookings.forEach((b: any) => {
      if (String(b.start_time).startsWith(dateStr)) {
        const rate = Number(b.actual_rate ?? b.student?.hourly_rate ?? 70);
        dailyRealized += Number(b.duration) * rate;
      }
    });

    return {
      date: format(day, ['year', '3months'].includes(range) ? 'MM-dd' : 'dd'),
      fullDate: dateStr,
      income: dailyIncome,
      expense: dailyExpense,
      incomeRmb: dailyIncomeRmb,
      expenseRmb: dailyExpenseRmb,
      realized: dailyRealized,
      net: dailyIncome - dailyExpense,
      netRmb: dailyIncomeRmb - dailyExpenseRmb,
    };
  });

  return {
    income,
    expense,
    net: income - expense,
    realized,
    realizedRmb,
    byCurrency,
    transactions,
    chartData,
    defaultCurrency: DEFAULT_CURRENCY,
  };
}
