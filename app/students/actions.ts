"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 创建学员 + 自动记账
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "用户未登录" };
  
  const name = formData.get("name") as string;
  const studentCode = formData.get("studentId") as string; // 前端字段叫 studentId，对应数据库 student_code
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const businessId = formData.get("businessId") as string;
  const level = (formData.get("level") as string) || "Year 11"; 
  const hourlyRate = Number(formData.get("hourlyRate")) || 70;
  const initialBalance = Number(formData.get("balance")) || 0;

  if (!name || !businessId) return { error: "姓名必填" };

  // A. 插入学员
  const { data: newStudent, error: studentError } = await supabase.from("students").insert({
    name,
    student_code: studentCode, 
    subject,
    teacher,
    level, 
    hourly_rate: hourlyRate,
    balance: initialBalance,
    business_unit_id: businessId,
  }).select().single();

  if (studentError) return { error: studentError.message };

  // B. ✅ 自动同步流水 (备注带学号)
  if (initialBalance > 0) {
    const amount = initialBalance * hourlyRate;
    // 构造备注: [S202601] Michael Wang - 初始充值
    const desc = `初始充值: [${studentCode || '无学号'}] ${name} (+${initialBalance}课时)`;

    await supabase.from("transactions").insert({
      type: "income",
      amount: amount,
      category: "Tuition",
      description: desc,
      transaction_date: new Date().toISOString(),
      business_unit_id: businessId,
      created_by: user.id,
      student_id: newStudent?.id,
      quantity: initialBalance,
    });
  }

  revalidatePath("/students");
  revalidatePath("/");
  revalidatePath("/finance"); 
  return { success: true };
}

// 2. 删除学员
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) return { error: error.message };
  revalidatePath("/students");
  return { success: true };
}

// 3. 学员充值 + 自动记账
export async function topUpStudent(studentId: string, hoursToAdd: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "用户未登录" };

  // A. 查学员信息 (多查一个 student_code)
  const { data: student, error: fetchError } = await supabase
    .from("students")
    .select("name, student_code, balance, hourly_rate, business_unit_id")
    .eq("id", studentId)
    .single();

  if (fetchError || !student) return { error: "找不到学员" };

  // B. 更新余额
  const newBalance = Number(student.balance) + hoursToAdd;
  const { error: updateError } = await supabase
    .from("students")
    .update({ balance: newBalance })
    .eq("id", studentId);

  if (updateError) return { error: updateError.message };

  // C. ✅ 自动记流水 (备注带学号)
  if (hoursToAdd > 0) {
    const incomeAmount = hoursToAdd * (student.hourly_rate || 70);
    const desc = `学员充值: [${student.student_code || '无学号'}] ${student.name} (+${hoursToAdd}课时)`;
    
    await supabase.from("transactions").insert({
      type: "income",
      amount: incomeAmount,
      category: "Tuition",
      description: desc,
      transaction_date: new Date().toISOString(),
      business_unit_id: student.business_unit_id,
      created_by: user.id,
      student_id: studentId,
      quantity: hoursToAdd,
    });
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/finance");
  revalidatePath("/");
  return { success: true };
}