"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- 1. 创建预约 (Create) ---
export async function createBooking(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  // 鉴权
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登录" };

  // 获取数据
  const studentId = formData.get("studentId") as string;
  const dateStr = formData.get("date") as string; // yyyy-MM-dd
  const timeStr = formData.get("time") as string; // HH:mm
  const duration = Number(formData.get("duration"));
  const location = formData.get("location") as string;
  const businessId = formData.get("businessId") as string;

  if (!studentId || !dateStr || !timeStr) {
    return { error: "信息不完整" };
  }

  // 计算时间 (简单的字符串拼接，生成 ISO 格式)
  // 注意：这里假设输入的是本地时间，存入数据库时 Supabase 会处理时区
  const startDateTime = new Date(`${dateStr}T${timeStr}`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);

  const { error } = await supabase.from("bookings").insert({
    student_id: studentId,
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    duration: duration,
    location: location,
    status: "confirmed", // 默认为“待办”
    business_unit_id: businessId,
    created_by: user.id
  });

  if (error) {
    console.error("Create Booking Error:", error);
    return { error: error.message };
  }

  revalidatePath("/bookings");
  revalidatePath("/"); // 刷新首页日历
  return { success: true };
}

// --- 2. 更新预约 (Edit) ---
export async function updateBooking(
  id: string, 
  data: { startTime: string; duration: number; location: string }
) {
  const supabase = await createClient();
  
  // 计算结束时间
  const start = new Date(data.startTime);
  const end = new Date(start.getTime() + data.duration * 60 * 60 * 1000);

  const { error } = await supabase
    .from("bookings")
    .update({
      start_time: data.startTime,
      end_time: end.toISOString(),
      duration: data.duration,
      location: data.location
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/");
  return { success: true };
}

// --- 3. 完成课程 (Complete) - 核心逻辑：扣除课时 ---
export async function completeBooking(bookingId: string, studentId: string, duration: number) {
  const supabase = await createClient();

  // A. 检查课程状态，防止重复扣费
  const { data: booking } = await supabase
    .from("bookings")
    .select("status")
    .eq("id", bookingId)
    .single();

  if (booking?.status === 'completed') {
    return { error: "该课程已完成，请勿重复操作" };
  }

  // B. 更新课程状态为 "completed"
  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: 'completed' })
    .eq("id", bookingId);

  if (bookingError) return { error: bookingError.message };

  // C. 扣除学生余额 (Balance - Duration)
  // 先查当前余额
  const { data: student } = await supabase
    .from("students")
    .select("balance")
    .eq("id", studentId)
    .single();

  if (student) {
    const newBalance = Number(student.balance) - duration;
    
    const { error: balanceError } = await supabase
      .from("students")
      .update({ balance: newBalance })
      .eq("id", studentId);

    if (balanceError) console.error("Balance Deduct Error:", balanceError);
  }

  revalidatePath("/bookings");
  revalidatePath("/students"); // 刷新学生列表余额
  revalidatePath("/"); // 刷新首页KPI
  return { success: true };
}

// --- 4. 取消预约 (Cancel) ---
export async function cancelBooking(id: string) {
  const supabase = await createClient();

  // 如果是从“已完成”变回“取消”，理论上要把课时退回去，
  // 但为了简化逻辑，建议只允许“待办”->“取消”。
  // 如果需要回滚逻辑，需要更复杂的事务处理。
  
  const { error } = await supabase
    .from("bookings")
    .update({ status: 'cancelled' })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/");
  return { success: true };
}

// --- 5. 删除预约 (Delete - 物理删除) ---
export async function deleteBooking(id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("bookings")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/");
  return { success: true };
}