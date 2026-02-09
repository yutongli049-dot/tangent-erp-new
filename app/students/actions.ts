"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 创建学员 (Create) + 自动记账
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const studentId = formData.get("studentId") as string;
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const businessId = formData.get("businessId") as string;
  const level = (formData.get("level") as string) || "Year 11"; 
  
  // 获取费率和余额
  const hourlyRate = Number(formData.get("hourlyRate")) || 70;
  const initialBalance = Number(formData.get("balance")) || 0;

  if (!name || !businessId) {
    return { error: "姓名必填" };
  }

  // A. 插入学员
  const { error: studentError } = await supabase.from("students").insert({
    name,
    student_code: studentId, 
    subject,
    teacher,
    level, 
    hourly_rate: hourlyRate,
    balance: initialBalance,
    business_unit_id: businessId,
  });

  if (studentError) {
    console.error("Create Student Error:", studentError);
    return { error: studentError.message };
  }

  // B. ✅ 自动同步流水：如果有初始余额，自动记一笔收入
  if (initialBalance > 0) {
    const amount = initialBalance * hourlyRate;
    const { error: transactionError } = await supabase.from("transactions").insert({
      type: "income",
      amount: amount,
      category: "Tuition",
      description: `新学员初始充值: ${name} (${initialBalance}课时)`,
      transaction_date: new Date().toISOString(), // 记为今天
      business_unit_id: businessId,
    });

    if (transactionError) console.error("Auto-Transaction Error:", transactionError);
  }

  revalidatePath("/students");
  revalidatePath("/");
  revalidatePath("/finance"); // 刷新财务页
  return { success: true };
}

// 2. 删除学员 (Delete)
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) return { error: error.message };
  revalidatePath("/students");
  return { success: true };
}

// 3. 学员充值 (Top Up) + 自动记账
export async function topUpStudent(studentId: string, hoursToAdd: number) {
  const supabase = await createClient();

  // A. 第一步：查学员信息 (为了获取费率和BusinessID)
  const { data: student, error: fetchError } = await supabase
    .from("students")
    .select("name, balance, hourly_rate, business_unit_id")
    .eq("id", studentId)
    .single();

  if (fetchError || !student) return { error: "找不到学员" };

  // B. 第二步：更新余额
  const newBalance = Number(student.balance) + hoursToAdd;
  const { error: updateError } = await supabase
    .from("students")
    .update({ balance: newBalance })
    .eq("id", studentId);

  if (updateError) return { error: updateError.message };

  // C. ✅ 第三步：自动记一笔流水 (收入 = 课时 × 费率)
  // 如果是正数充值才记收入，如果是负数(扣课)通常在消课时处理，这里主要处理充值
  if (hoursToAdd > 0) {
    const incomeAmount = hoursToAdd * (student.hourly_rate || 70);
    
    await supabase.from("transactions").insert({
      type: "income",
      amount: incomeAmount,
      category: "Tuition",
      description: `学员充值: ${student.name} (+${hoursToAdd}课时)`,
      transaction_date: new Date().toISOString(),
      business_unit_id: student.business_unit_id,
    });
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/finance"); // 确保财务数据立刻变动
  revalidatePath("/");
  return { success: true };
}