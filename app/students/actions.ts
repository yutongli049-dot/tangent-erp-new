"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 1. 创建学员 (之前的代码)
export async function createStudent(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const level = formData.get("level") as string;
  const phone = formData.get("phone") as string;
  const email = formData.get("email") as string;
  const businessId = formData.get("businessId") as string;
  
  const { error } = await supabase.from("students").insert({
    name, level, phone, email, business_unit_id: businessId, balance: 0,
  });

  if (error) return { error: error.message };

  revalidatePath("/students");
  redirect("/students");
}

// 2. ✅ 新增：学员充值 (Top Up)
// 这个操作是一个 "Transaction" (事务)：既要记一笔收入，又要改学员余额
export async function topUpStudent(
  studentId: string, 
  amount: number, 
  hoursToAdd: number, 
  businessId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // A. 记一笔收入 (Transactions 表)
  const { error: txError } = await supabase.from("transactions").insert({
    amount: amount,
    type: "income",
    category: "Tuition",
    description: `学员充值: ${hoursToAdd} 课时`,
    transaction_date: new Date().toISOString(),
    business_unit_id: businessId,
    student_id: studentId,
    quantity: hoursToAdd, // ✅ 关键升级：把课时数存下来，方便以后回滚！
    created_by: user.id,
  });

  if (txError) return { error: "记账失败: " + txError.message };

  // B. 增加学员余额
  const { data: student } = await supabase
    .from("students")
    .select("balance")
    .eq("id", studentId)
    .single();

  if (student) {
    const { error: updateError } = await supabase
      .from("students")
      .update({ balance: student.balance + hoursToAdd })
      .eq("id", studentId);

    if (updateError) return { error: "更新余额失败: " + updateError.message };
  }

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}

// 3. ✅ 新增：删除学员 (斩草除根版)
export async function deleteStudent(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // A. 先删除关联的流水 (Transactions)
  const { error: txError } = await supabase
    .from("transactions")
    .delete()
    .eq("student_id", id);
  
  if (txError) return { error: "删除关联流水失败: " + txError.message };

  // B. 再删除关联的预约 (Bookings)
  const { error: bkError } = await supabase
    .from("bookings")
    .delete()
    .eq("student_id", id);

  if (bkError) return { error: "删除关联预约失败: " + bkError.message };

  // C. 最后删除学员本体 (Students)
  const { error: stError } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (stError) return { error: "删除学员失败: " + stError.message };

  revalidatePath("/students");
  revalidatePath("/");
  return { success: true };
}