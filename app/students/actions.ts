"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 创建学员 (Create)
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const studentId = formData.get("studentId") as string;
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const hourlyRate = formData.get("hourlyRate");
  const balance = formData.get("balance"); 
  const businessId = formData.get("businessId") as string;

  if (!name || !businessId) {
    return { error: "姓名必填" };
  }

  const { error } = await supabase.from("students").insert({
    name,
    // ✅ 修复：映射到数据库已有的 'student_code' 字段
    student_code: studentId, 
    subject,
    teacher,
    hourly_rate: Number(hourlyRate) || 70,
    balance: Number(balance) || 0,
    business_unit_id: businessId,
  });

  if (error) {
    console.error("Create Student Error:", error);
    return { error: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}

// 2. 删除学员 (Delete)
export async function deleteStudent(studentId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath("/students");
  return { success: true };
}

// 3. 学员充值 (Top Up)
export async function topUpStudent(studentId: string, amount: number) {
  const supabase = await createClient();

  // 第一步：查当前余额
  const { data: student, error: fetchError } = await supabase
    .from("students")
    .select("balance")
    .eq("id", studentId)
    .single();

  if (fetchError || !student) return { error: "找不到学员" };

  // 第二步：更新余额
  const newBalance = Number(student.balance) + amount;

  const { error } = await supabase
    .from("students")
    .update({ balance: newBalance })
    .eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}