"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 创建学员 (Create)
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  // 获取表单数据
  const name = formData.get("name") as string;
  const studentId = formData.get("studentId") as string;
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const hourlyRate = formData.get("hourlyRate");
  const balance = formData.get("balance"); 
  const businessId = formData.get("businessId") as string;
  
  // ✅ 关键点：获取 level，如果前端没传，给个默认值 "Year 11"
  // 旧代码里肯定少了这一行！
  const level = (formData.get("level") as string) || "Year 11"; 

  if (!name || !businessId) {
    return { error: "姓名必填" };
  }

  const { error } = await supabase.from("students").insert({
    name,
    student_code: studentId, 
    subject,
    teacher,
    
    // ✅ 关键点：将 level 写入数据库
    // 旧代码的 insert 对象里肯定没有这一行！
    level: level, 
    
    hourly_rate: Number(hourlyRate) || 70,
    balance: Number(balance) || 0,
    business_unit_id: businessId,
  });

  if (error) {
    console.error("Create Student Error:", error);
    return { error: error.message }; // 把具体错误返回给前端
  }

  revalidatePath("/students");
  revalidatePath("/");
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

// 3. 学员充值 (Top Up)
export async function topUpStudent(studentId: string, amount: number) {
  const supabase = await createClient();

  const { data: student, error: fetchError } = await supabase
    .from("students").select("balance").eq("id", studentId).single();

  if (fetchError || !student) return { error: "找不到学员" };

  const newBalance = Number(student.balance) + amount;
  const { error } = await supabase
    .from("students").update({ balance: newBalance }).eq("id", studentId);

  if (error) return { error: error.message };

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}