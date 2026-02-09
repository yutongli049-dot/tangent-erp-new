"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 创建学员 (Create) + 自动记账
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  // ✅ 1. 获取当前用户 (操作员)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "用户未登录" };

  const name = formData.get("name") as string;
  const studentId = formData.get("studentId") as string;
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const businessId = formData.get("businessId") as string;
  const level = (formData.get("level") as string) || "Year 11"; 
  const hourlyRate = Number(formData.get("hourlyRate")) || 70;
  const initialBalance = Number(formData.get("balance")) || 0;

  if (!name || !businessId) {
    return { error: "姓名必填" };
  }

  // A. 插入学员
  const { data: newStudent, error: studentError } = await supabase.from("students").insert({
    name,
    student_code: studentId, 
    subject,
    teacher,
    level, 
    hourly_rate: hourlyRate,
    balance: initialBalance,
    business_unit_id: businessId,
  }).select().single(); // select() 拿到新学员 ID

  if (studentError) return { error: studentError.message };

  // B. 自动同步流水 (如果有初始余额)
  if (initialBalance > 0) {
    const amount = initialBalance * hourlyRate;
    await supabase.from("transactions").insert({
      type: "income",
      amount: amount,
      category: "Tuition",
      description: `新学员初始充值: ${name} (${initialBalance}课时)`,
      transaction_date: new Date().toISOString(),
      business_unit_id: businessId,
      // ✅ 2. 补上 created_by
      created_by: user.id,
      student_id: newStudent?.id, // 可选：关联学员ID
      quantity: initialBalance,   // 可选：记录课时数
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

// 3. 学员充值 (Top Up) + 自动记账
export async function topUpStudent(studentId: string, hoursToAdd: number) {
  const supabase = await createClient();

  // ✅ 1. 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "用户未登录" };

  // A. 查学员信息
  const { data: student, error: fetchError } = await supabase
    .from("students")
    .select("name, balance, hourly_rate, business_unit_id")
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

  // C. 自动记一笔流水
  if (hoursToAdd > 0) {
    const incomeAmount = hoursToAdd * (student.hourly_rate || 70);
    
    await supabase.from("transactions").insert({
      type: "income",
      amount: incomeAmount,
      category: "Tuition",
      description: `学员充值: ${student.name} (+${hoursToAdd}课时)`,
      transaction_date: new Date().toISOString(),
      business_unit_id: student.business_unit_id,
      // ✅ 2. 补上 created_by
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