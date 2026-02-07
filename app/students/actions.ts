"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 1. ✅ 升级版：创建学员
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 提取所有新字段
  const name = formData.get("name") as string;
  const studentCode = formData.get("studentCode") as string; // 新增
  const subject = formData.get("subject") as string;         // 新增
  const teacher = formData.get("teacher") as string;         // 新增
  const level = formData.get("level") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const hourlyRate = parseFloat(formData.get("hourlyRate") as string) || 0; // 新增
  const businessId = formData.get("businessId") as string;
  
  const { error } = await supabase.from("students").insert({
    name,
    student_code: studentCode,
    subject,
    teacher,
    level,
    phone,
    email,
    hourly_rate: hourlyRate,
    business_unit_id: businessId,
    balance: 0,
  });

  if (error) {
    console.error("Create Student Error:", error);
    return { error: error.message };
  }

  revalidatePath("/students");
  redirect("/students");
}

// 2. 充值 (保持不变)
export async function topUpStudent(
  studentId: string, 
  amount: number, 
  hoursToAdd: number, 
  businessId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // A. 记一笔收入
  const { error: txError } = await supabase.from("transactions").insert({
    amount: amount,
    type: "income",
    category: "Tuition",
    description: `学员充值: ${hoursToAdd} 课时`,
    transaction_date: new Date().toISOString(),
    business_unit_id: businessId,
    student_id: studentId,
    quantity: hoursToAdd,
    created_by: user.id,
  });

  if (txError) return { error: "记账失败: " + txError.message };

  // B. 增加余额
  const { data: student } = await supabase.from("students").select("balance").eq("id", studentId).single();
  if (student) {
    await supabase.from("students").update({ balance: student.balance + hoursToAdd }).eq("id", studentId);
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}

// 3. 删除学员 (保持不变)
export async function deleteStudent(id: string) {
  const supabase = await createClient();
  
  await supabase.from("transactions").delete().eq("student_id", id);
  await supabase.from("bookings").delete().eq("student_id", id);
  await supabase.from("students").delete().eq("id", id);

  revalidatePath("/students");
  return { success: true };
}