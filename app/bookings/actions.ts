"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addWeeks } from "date-fns";

// 1. ✅ 修复：增加 prevState 参数，以匹配 useActionState/useFormState
export async function createBooking(prevState: any, formData: FormData) {
  const supabase = await createClient();
  
  const studentId = formData.get("studentId") as string;
  const startTimeStr = formData.get("startTime") as string; 
  const duration = Number(formData.get("duration"));
  const location = formData.get("location") as string;
  const businessId = formData.get("businessId") as string;
  const repeatCount = Number(formData.get("repeatCount") || 1);

  // 简单的后端校验
  if (!studentId || !startTimeStr || !duration) {
    return { error: "请填写完整信息" };
  }

  const baseStartTime = new Date(startTimeStr);
  const bookingsToInsert = [];

  try {
    // 循环生成课程数据
    for (let i = 0; i < repeatCount; i++) {
      const currentStart = addWeeks(baseStartTime, i);
      const currentEnd = new Date(currentStart.getTime() + duration * 60 * 60 * 1000);

      bookingsToInsert.push({
        student_id: studentId,
        business_unit_id: businessId,
        start_time: currentStart.toISOString(),
        end_time: currentEnd.toISOString(),
        duration: duration,
        location: location,
        status: "confirmed",
      });
    }

    const { error } = await supabase.from("bookings").insert(bookingsToInsert);

    if (error) {
      console.error("Supabase error:", error);
      return { error: "创建失败: " + error.message };
    }

    revalidatePath("/bookings");
    revalidatePath("/");
    return { success: true };
    
  } catch (err) {
    console.error("Server error:", err);
    return { error: "服务器内部错误" };
  }
}

// ------------------------------------------------------------------
// 以下函数通常由 onClick 直接调用，不需要 prevState 参数，保持原样即可
// ------------------------------------------------------------------

// 2. 完成预约
export async function completeBooking(bookingId: string, studentId: string, duration: number) {
  const supabase = await createClient();

  const { error: bookingError } = await supabase
    .from("bookings")
    .update({ status: "completed" })
    .eq("id", bookingId);

  if (bookingError) return { error: bookingError.message };

  // 扣余额逻辑
  const { data: student } = await supabase
    .from("students")
    .select("balance")
    .eq("id", studentId)
    .single();

  if (student) {
    const newBalance = Number(student.balance) - duration;
    await supabase
      .from("students")
      .update({ balance: newBalance })
      .eq("id", studentId);
  }

  revalidatePath("/bookings");
  revalidatePath("/");
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

// 4. 删除预约
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

// 5. 更新预约
export async function updateBooking(
  bookingId: string,
  data: { startTime: string; duration: number; location: string }
) {
  const supabase = await createClient();

  const start = new Date(data.startTime);
  const end = new Date(start.getTime() + data.duration * 60 * 60 * 1000);

  const { error } = await supabase
    .from("bookings")
    .update({
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration: data.duration,
      location: data.location,
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/");
  return { success: true };
}