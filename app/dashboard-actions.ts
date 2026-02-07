"use server";

import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats(businessId: string) {
  const supabase = await createClient();
  const now = new Date();
  
  // 1. 获取本月第一天和最后一天
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // 构建基础查询过滤器
  // 如果是 'tangent' (集团视角)，我们暂时不加 business_unit_id 过滤，或者你也可以选择只看特定几个
  // 这里为了简单，如果 businessId 不是 'tangent'，就严格过滤
  const isGroupView = businessId === 'tangent';

  // --- A. 计算本月净收入 (Income - Expense) ---
  let incomeQuery = supabase
    .from("transactions")
    .select("amount, type")
    .gte("transaction_date", startOfMonth)
    .lte("transaction_date", endOfMonth);
  
  if (!isGroupView) incomeQuery = incomeQuery.eq("business_unit_id", businessId);
  
  const { data: transactions } = await incomeQuery;

  let totalIncome = 0;
  if (transactions) {
    const income = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expense = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    totalIncome = income - expense;
  }

  // --- B. 计算活跃学员总数 ---
  let studentQuery = supabase
    .from("students")
    .select("id", { count: "exact", head: true }); // 只数数，不拿数据，省流量

  if (!isGroupView) studentQuery = studentQuery.eq("business_unit_id", businessId);
  
  const { count: studentCount } = await studentQuery;

  // --- C. 计算未来 7 天的待完成课程 ---
  const nextWeek = new Date();
  nextWeek.setDate(now.getDate() + 7);

  let bookingQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .gte("start_time", now.toISOString())
    .lte("start_time", nextWeek.toISOString())
    .neq("status", "cancelled"); // 排除已取消的

  if (!isGroupView) bookingQuery = bookingQuery.eq("business_unit_id", businessId);

  const { count: bookingCount } = await bookingQuery;

  return {
    income: totalIncome,
    studentCount: studentCount || 0,
    bookingCount: bookingCount || 0,
  };
}