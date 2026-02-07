"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// 1. 创建预约
export async function createBooking(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  // 提取表单数据
  const studentId = formData.get("studentId") as string;
  const startTime = formData.get("startTime") as string;
  const duration = parseFloat(formData.get("duration") as string);
  const businessId = formData.get("businessId") as string;
  const location = formData.get("location") as string;
  const notes = formData.get("notes") as string;
  // ✅ 获取 Zoom 链接字段
  const meetingUrl = formData.get("meetingUrl") as string;

  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 60 * 1000);

  // 插入数据库
  const { error } = await supabase.from("bookings").insert({
    student_id: studentId,
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    duration,
    location,
    notes,
    business_unit_id: businessId,
    status: "confirmed", // 初始状态为已确认
    meeting_url: meetingUrl, // ✅ 存入 meeting_url 字段
  });

  if (error) {
    console.error("Booking Error:", error);
    return { error: error.message };
  }

  revalidatePath("/");
  revalidatePath("/bookings"); // 刷新列表页
  redirect("/bookings"); // 创建成功后跳到列表页
}

// 2. 完成预约 (扣减余额)
export async function completeBooking(bookingId: string, studentId: string, duration: number) {
  const supabase = await createClient();

  // A. 更新预约状态
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", bookingId);

  if (bookingError) return { error: bookingError.message };

  // B. 扣减学员余额
  const { data: student } = await supabase
    .from("students")
    .select("balance")
    .eq("id", studentId)
    .single();
  
  if (student) {
    await supabase
      .from("students")
      .update({ balance: student.balance - duration })
      .eq("id", studentId);
  }

  revalidatePath("/bookings");
  revalidatePath("/"); // 刷新首页数据
  return { success: true };
}

// 3. 取消预约
export async function cancelBooking(bookingId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/");
  return { success: true };
}

// 4. ✅ 新增：彻底删除预约 (Delete)
export async function deleteBooking(bookingId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/");
  return { success: true };
}