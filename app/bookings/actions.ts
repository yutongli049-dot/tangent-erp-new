"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz"; 

// 1. 创建预约 (教培) - ✅ Zoom级高级循环排课
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
  const subject = formData.get("subject") as string;
  const teacher = formData.get("teacher") as string;
  const notes = formData.get("notes") as string;
  
  // ✅ 接收循环排课参数
  const repeatMode = formData.get("repeatMode") as string || "none"; 
  const endMode = formData.get("endMode") as string || "count"; 
  const repeatCount = Number(formData.get("repeatCount")) || 1;
  const endDateStr = formData.get("endDate") as string;

  if (!studentId || !dateStr || !timeStr) return { error: "信息不完整" };

  const timeZone = 'Pacific/Auckland';
  const bookingsToInsert = [];
  
  let currentStart = fromZonedTime(`${dateStr} ${timeStr}`, timeZone);
  let count = 0;
  const maxLoops = 52; // 安全限制：最多排一年的课 (52周)
  
  let targetEndDate: Date | null = null;
  if (repeatMode === 'weekly' && endMode === 'date' && endDateStr) {
    targetEndDate = fromZonedTime(`${endDateStr} 23:59:59`, timeZone);
  }

  // ✅ 智能循环生成器
  while (count < maxLoops) {
    if (repeatMode === 'none' && count >= 1) break;
    if (repeatMode === 'weekly' && endMode === 'count' && count >= repeatCount) break;
    if (repeatMode === 'weekly' && endMode === 'date' && targetEndDate && currentStart > targetEndDate) break;

    const endDateTime = new Date(currentStart.getTime() + duration * 60 * 60 * 1000);

    bookingsToInsert.push({
      student_id: studentId,
      start_time: currentStart.toISOString(),
      end_time: endDateTime.toISOString(),
      duration: duration,
      location: location,
      business_unit_id: businessId,
      status: 'confirmed',
      subject: subject || null,
      teacher: teacher || null,
      notes: notes || null
    });

    // 为下一次循环增加 7 天
    currentStart.setDate(currentStart.getDate() + 7);
    count++;
  }

  const { error } = await supabase.from("bookings").insert(bookingsToInsert);
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

// 3. 完成预约 (保持不变)
export async function completeBooking(id: string, studentId: string, duration: number) {
  const supabase = await createClient();
  const { error: bookingError } = await supabase.from("bookings").update({ status: 'completed' }).eq("id", id);
  if (bookingError) return { error: bookingError.message };

  const { data: student } = await supabase.from("students").select("balance").eq("id", studentId).single();
  if (student) {
    await supabase.from("students").update({ balance: Number(student.balance) - duration }).eq("id", studentId);
  }

  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance"); 
  return { success: true };
}

// 4. 取消预约 (保持不变)
export async function cancelBooking(id: string) {
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("status, student_id, duration").eq("id", id).single();
  if (!booking) return { error: "Booking not found" };

  if (booking.status === 'completed' && booking.student_id) {
    const { data: student } = await supabase.from("students").select("balance").eq("id", booking.student_id).single();
    if (student) {
      await supabase.from("students").update({ balance: Number(student.balance) + Number(booking.duration) }).eq("id", booking.student_id);
    }
  }

  const { error } = await supabase.from("bookings").update({ status: 'cancelled' }).eq("id", id);
  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance");
  return { success: true };
}

// 5. 删除预约 (保持不变)
export async function deleteBooking(id: string) {
  const supabase = await createClient();
  const { data: booking } = await supabase.from("bookings").select("status, student_id, duration").eq("id", id).single();
  if (booking && booking.status === 'completed' && booking.student_id) {
    const { data: student } = await supabase.from("students").select("balance").eq("id", booking.student_id).single();
    if (student) {
      await supabase.from("students").update({ balance: Number(student.balance) + Number(booking.duration) }).eq("id", booking.student_id);
    }
  }

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance");
  return { success: true };
}

// 6. 驾校极速排课 - ✅ 同步升级循环排课
export async function quickCreateDrivingBooking(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登录" };

  const businessId = formData.get("businessId") as string;
  const identifier = formData.get("identifier") as string; 
  const dateStr = formData.get("date") as string;
  const timeStr = formData.get("time") as string;
  const duration = Number(formData.get("duration"));
  const location = formData.get("location") as string;
  const actualRate = Number(formData.get("actualRate"));
  const subject = formData.get("subject") as string;
  const notes = formData.get("notes") as string;
  
  const repeatMode = formData.get("repeatMode") as string || "none"; 
  const endMode = formData.get("endMode") as string || "count"; 
  const repeatCount = Number(formData.get("repeatCount")) || 1;
  const endDateStr = formData.get("endDate") as string;
  
  const metadata = {
    useInstructorCar: formData.get("useInstructorCar") === "true",
    needPickup: formData.get("needPickup") === "true",
    pickupAddress: formData.get("pickupAddress") as string,
    plateNumber: formData.get("plateNumber") as string,
  };

  if (!identifier || !dateStr || !timeStr) return { error: "信息不完整" };

  let studentId = "";
  const { data: existingStudent } = await supabase
    .from("students")
    .select("id")
    .eq("business_unit_id", businessId)
    .or(`student_code.eq.${identifier},name.eq.${identifier}`)
    .limit(1)
    .single();

  if (existingStudent) {
    studentId = existingStudent.id;
  } else {
    const { data: newStudent, error: createError } = await supabase
      .from("students")
      .insert({
        name: identifier, 
        student_code: identifier, 
        business_unit_id: businessId,
        level: "Driving",
        balance: 0,
        hourly_rate: actualRate 
      })
      .select("id")
      .single();
      
    if (createError) return { error: "学员创建失败: " + createError.message };
    studentId = newStudent.id;
  }

  const timeZone = 'Pacific/Auckland';
  const bookingsToInsert = [];
  
  let currentStart = fromZonedTime(`${dateStr} ${timeStr}`, timeZone);
  let count = 0;
  const maxLoops = 52; 
  
  let targetEndDate: Date | null = null;
  if (repeatMode === 'weekly' && endMode === 'date' && endDateStr) {
    targetEndDate = fromZonedTime(`${endDateStr} 23:59:59`, timeZone);
  }

  while (count < maxLoops) {
    if (repeatMode === 'none' && count >= 1) break;
    if (repeatMode === 'weekly' && endMode === 'count' && count >= repeatCount) break;
    if (repeatMode === 'weekly' && endMode === 'date' && targetEndDate && currentStart > targetEndDate) break;

    const endDateTime = new Date(currentStart.getTime() + duration * 60 * 60 * 1000);

    bookingsToInsert.push({
      student_id: studentId,
      start_time: currentStart.toISOString(),
      end_time: endDateTime.toISOString(),
      duration: duration,
      location: location,
      business_unit_id: businessId,
      status: 'confirmed',
      actual_rate: actualRate,
      subject: subject || null,
      notes: notes || null,
      metadata: metadata
    });
    
    currentStart.setDate(currentStart.getDate() + 7);
    count++;
  }

  const { error } = await supabase.from("bookings").insert(bookingsToInsert);
  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  revalidatePath("/students");
  return { success: true };
}