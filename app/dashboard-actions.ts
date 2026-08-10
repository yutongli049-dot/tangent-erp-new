"use server";

import { createClient } from "@/lib/supabase/server";
import { startOfMonth, endOfMonth } from "date-fns";
import { isPaymentAlert } from "@/lib/student-payment";
import { aggregateByCurrency, emptyDualTotals } from "@/lib/currency";

export async function getDashboardStats(businessId: string) {
  const supabase = await createClient();
  const now = new Date();
  
  const monthStart = startOfMonth(now).toISOString();
  const monthEnd = endOfMonth(now).toISOString();

  const [
    { data: transactions },
    { data: bookings },
    { data: students }
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, type, transaction_date, currency")
      .eq("business_unit_id", businessId)
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd),
    
    supabase
      .from("bookings")
      .select(`
        id, start_time, end_time, duration, status, location,
        student:students (
          id, name, student_code, teacher, subject, balance, payment_type
        )
      `)
      .eq("business_unit_id", businessId)
      .neq("status", "cancelled"),

    supabase
      .from("students")
      .select("balance, hourly_rate, name, id, payment_type")
      .eq("business_unit_id", businessId)
  ]);

  const byCurrency = aggregateByCurrency(transactions || []);
  const cashIncome = byCurrency.NZD.income;
  const cashExpense = byCurrency.NZD.expense;
  const netCashFlow = byCurrency.NZD.net;
  const cashIncomeRmb = byCurrency.RMB.income;
  const netCashFlowRmb = byCurrency.RMB.net;

  const chartMap = new Map<string, number>();
  transactions?.forEach(t => {
    if ((t.currency || "NZD") === "RMB") return;
    const amt = Number(t.amount);
    const day = t.transaction_date.split('T')[0];
    const net = t.type === 'income' ? amt : -amt;
    chartMap.set(day, (chartMap.get(day) || 0) + net);
  });

  const chartData = Array.from(chartMap.entries())
    .map(([date, net]) => ({ date, net }))
    .sort((a, b) => a.date.localeCompare(b.date));

  let realizedRevenue = 0;
  bookings?.forEach(b => {
    if (b.status === 'completed' && new Date(b.start_time) >= startOfMonth(now)) {
      realizedRevenue += Number(b.duration) * 70; 
    }
  });

  let unearnedRevenue = 0;
  const lowBalanceStudents: any[] = [];
  
  students?.forEach(s => {
    const bal = Number(s.balance);
    const rate = Number(s.hourly_rate) || 0;
    if (bal > 0) unearnedRevenue += bal * rate;
    if (isPaymentAlert(bal, s.payment_type)) lowBalanceStudents.push(s);
  });

  return {
    cashIncome,
    cashExpense,
    netCashFlow,
    cashIncomeRmb,
    netCashFlowRmb,
    byCurrency: byCurrency || emptyDualTotals(),
    realizedRevenue,
    unearnedRevenue,
    chartData,
    calendarBookings: bookings || [],
    lowBalanceStudents
  };
}
