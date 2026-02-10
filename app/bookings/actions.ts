"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. 创建预约 (保持不变)
export async function createBooking(prevState: any, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登录" };

  const studentId = formData.get("studentId") as string;
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const duration = Number(formData.get("duration"));
  const location = formData.get("location") as string;
  const businessId = formData.get("businessId") as string;

  if (!studentId || !dateStr || !timeStr) return { error: "信息不完整" };

  const startDateTime = new Date(`${dateStr}T${timeStr}`);
  const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);

  const { error } = await supabase.from("bookings").insert({
    student_id: studentId,
    start_time: startDateTime.toISOString(),
    end_time: endDateTime.toISOString(),
    duration: duration,
    location: location,
    business_unit_id: businessId,
    status: 'confirmed',
    created_by: user.id
  });

  if (error) return { error: error.message };
  revalidatePath("/bookings");
  return { success: true };
}

// 2. 更新预约 (保持不变)
export async function updateBooking(id: string, data: { startTime: string, duration: number, location: string }) {
  const supabase = await createClient();
  
  const startDate = new Date(data.startTime);
  const endDate = new Date(startDate.getTime() + data.duration * 60 * 60 * 1000);

  const { error } = await supabase.from("bookings").update({
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    duration: data.duration,
    location: data.location
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/bookings");
  return { success: true };
}

// 3. 完成预约 (保持不变，这里负责扣费)
export async function completeBooking(id: string, studentId: string, duration: number) {
  const supabase = await createClient();

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: 'completed' })
    .eq("id", id);

  if (bookingError) return { error: bookingError.message };

  // 扣除余额
  const { data: student } = await supabase.from("students").select("balance").eq("id", studentId).single();
  if (student) {
    await supabase.from("students").update({ balance: Number(student.balance) - duration }).eq("id", studentId);
  }

  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance"); 
  return { success: true };
}

// 4. ✅ 升级：取消预约 (带“退费”回滚)
export async function cancelBooking(id: string) {
  const supabase = await createClient();

  // A. 操作前先查：这节课之前是啥状态？
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, student_id, duration")
    .eq("id", id)
    .single();

  if (!booking) return { error: "Booking not found" };

  // B. 如果这节课已经是“完成 (completed)”状态，说明之前扣过钱了
  // 现在要取消它，必须把课时“退给”学生
  if (booking.status === 'completed' && booking.student_id) {
    const { data: student } = await supabase
      .from("students")
      .select("balance")
      .eq("id", booking.student_id)
      .single();
    
    if (student) {
      const newBalance = Number(student.balance) + Number(booking.duration);
      await supabase
        .from("students")
        .update({ balance: newBalance })
        .eq("id", booking.student_id);
    }
  }

  // C. 更新状态为取消
  const { error } = await supabase
    .from("bookings")
    .update({ status: 'cancelled' })
    .eq("id", id);

  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance");
  return { success: true };
}

// 5. ✅ 升级：删除预约 (带“退费”回滚)
export async function deleteBooking(id: string) {
  const supabase = await createClient();

  // A. 同样，删除前先查状态
  const { data: booking } = await supabase
    .from("bookings")
    .select("status, student_id, duration")
    .eq("id", id)
    .single();

  // B. 如果删除的是“已完成”的课，必须退还课时
  if (booking && booking.status === 'completed' && booking.student_id) {
    const { data: student } = await supabase
      .from("students")
      .select("balance")
      .eq("id", booking.student_id)
      .single();
    
    if (student) {
      const newBalance = Number(student.balance) + Number(booking.duration);
      await supabase
        .from("students")
        .update({ balance: newBalance })
        .eq("id", booking.student_id);
    }
  }

  // C. 物理删除
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance");
  return { success: true };
}