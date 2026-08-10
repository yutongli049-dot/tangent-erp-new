"use server";

import { createClient } from "@/lib/supabase/server";
import { isPaymentAlert } from "@/lib/student-payment";
import { aggregateByCurrency, emptyDualTotals, normalizeCurrency } from "@/lib/currency";
import { getNzMonthBounds } from "@/lib/timezone";

/**
 * Dashboard 本月统计 — 与 Finance「本月」1:1 对齐
 * 净现金流 = Σ income − Σ expense（按 NZD/RMB 分轨，含全部类别）
 * 消课产值 = completed bookings × (actual_rate || hourly_rate)
 * 资金池 = Σ (balance > 0 ? balance × hourly_rate : 0) 按学员 currency 分轨
 */
export async function getDashboardStats(businessId: string) {
  const supabase = await createClient();
  const { startIso, endIso } = getNzMonthBounds(0);

  const [
    { data: transactions },
    { data: completedBookings },
    { data: calendarBookings },
    { data: students },
  ] = await Promise.all([
    // A. 本月全部流水（不限 Tuition）
    supabase
      .from("transactions")
      .select("amount, type, transaction_date, currency")
      .eq("business_unit_id", businessId)
      .gte("transaction_date", startIso)
      .lte("transaction_date", endIso),

    // B. 本月已完成课程 → 产值
    supabase
      .from("bookings")
      .select(`
        start_time, duration, actual_rate, status,
        student:students ( hourly_rate, currency )
      `)
      .eq("business_unit_id", businessId)
      .eq("status", "completed")
      .gte("start_time", startIso)
      .lte("start_time", endIso),

    // C. 日历 / 待办（非取消）
    supabase
      .from("bookings")
      .select(`
        id, start_time, end_time, duration, status, location, student_id,
        student:students (
          id, name, student_code, teacher, subject, balance, payment_type, currency
        )
      `)
      .eq("business_unit_id", businessId)
      .neq("status", "cancelled"),

    // D. 学员资金池
    supabase
      .from("students")
      .select("balance, hourly_rate, name, id, payment_type, currency")
      .eq("business_unit_id", businessId),
  ]);

  // --- 1. 净现金流：全部 Income − 全部 Expense ---
  const byCurrency = aggregateByCurrency(transactions || []);
  const cashIncome = byCurrency.NZD.income;
  const cashExpense = byCurrency.NZD.expense;
  const netCashFlow = byCurrency.NZD.net;
  const cashIncomeRmb = byCurrency.RMB.income;
  const cashExpenseRmb = byCurrency.RMB.expense;
  const netCashFlowRmb = byCurrency.RMB.net;

  const chartMap = new Map<string, number>();
  transactions?.forEach((t) => {
    if (normalizeCurrency(t.currency) === "RMB") return;
    const amt = Number(t.amount);
    const day = String(t.transaction_date).split("T")[0];
    const net = t.type === "income" ? amt : t.type === "expense" ? -Math.abs(amt) : 0;
    if (t.type === "income" || t.type === "expense") {
      chartMap.set(day, (chartMap.get(day) || 0) + net);
    }
  });

  const chartData = Array.from(chartMap.entries())
    .map(([date, net]) => ({ date, net }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- 2. 本月已消课产值（按学员费率币种分轨）---
  let realizedRevenue = 0;
  let realizedRevenueRmb = 0;
  completedBookings?.forEach((b: any) => {
    const rate = Number(b.actual_rate ?? b.student?.hourly_rate ?? 70);
    const value = Number(b.duration) * rate;
    if (normalizeCurrency(b.student?.currency) === "RMB") {
      realizedRevenueRmb += value;
    } else {
      realizedRevenue += value;
    }
  });

  // --- 3. 资金池：balance > 0 → balance × hourly_rate，按 currency 分轨 ---
  let unearnedRevenue = 0;
  let unearnedRevenueRmb = 0;
  const lowBalanceStudents: any[] = [];

  students?.forEach((s) => {
    const bal = Number(s.balance);
    const rate = Number(s.hourly_rate) || 0;
    if (bal > 0) {
      const value = bal * rate;
      if (normalizeCurrency(s.currency) === "RMB") unearnedRevenueRmb += value;
      else unearnedRevenue += value;
    }
    if (isPaymentAlert(bal, s.payment_type)) lowBalanceStudents.push(s);
  });

  return {
    cashIncome,
    cashExpense,
    netCashFlow,
    cashIncomeRmb,
    cashExpenseRmb,
    netCashFlowRmb,
    byCurrency: byCurrency || emptyDualTotals(),
    realizedRevenue,
    realizedRevenueRmb,
    unearnedRevenue,
    unearnedRevenueRmb,
    chartData,
    calendarBookings: calendarBookings || [],
    lowBalanceStudents,
    monthRange: { startIso, endIso },
  };
}
