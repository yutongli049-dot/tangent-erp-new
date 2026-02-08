"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const name = formData.get("name") as string;
  const studentId = formData.get("studentId") as string; // 学号
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const hourlyRate = formData.get("hourlyRate");
  const balance = formData.get("balance"); // ✅ 新增：接收余额
  const businessId = formData.get("businessId") as string;

  // 简单校验
  if (!name || !businessId) {
    return { error: "姓名必填" };
  }

  const { error } = await supabase.from("students").insert({
    name,
    student_id_code: studentId,
    subject,
    teacher,
    hourly_rate: Number(hourlyRate) || 70, // 默认 70
    balance: Number(balance) || 0,         // ✅ 写入余额
    business_unit_id: businessId,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}