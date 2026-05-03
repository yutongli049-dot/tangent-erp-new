"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 🌟 核心利器：动态获取新西兰当日的时区偏移量 (+12:00 或 +13:00)
// 彻底免疫服务器的时区干扰
function getNZOffset(dateStr: string) {
   const d = new Date(`${dateStr}T12:00:00Z`); 
   const formatter = new Intl.DateTimeFormat('en-US', {
       timeZone: 'Pacific/Auckland',
       timeZoneName: 'shortOffset'
   });
   const parts = formatter.formatToParts(d);
   const tz = parts.find(p => p.type === 'timeZoneName')?.value;
   if (tz && tz.includes('+13')) return '+13:00';
   return '+12:00';
}

// 1. 创建预约 (教培)
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
  
  const repeatMode = formData.get("repeatMode") as string || "none"; 
  const endMode = formData.get("endMode") as string || "count"; 
  const repeatCount = Number(formData.get("repeatCount")) || 1;
  const endDateStr = formData.get("endDate") as string;

  if (!studentId || !dateStr) return { error: "信息不完整" };

  // 🧠 纯数学推算：只使用 UTC 确保计算不出差错
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); 
  const startDayOfWeek = baseDate.getUTCDay(); 

  let schedule: { dayOfWeek: string, time: string }[] = [];
  if (repeatMode === 'weekly') {
      const wsStr = formData.get("weeklySchedule") as string;
      if (wsStr) {
          try { schedule = JSON.parse(wsStr); } catch(e) {}
      }
  } else {
      schedule = [{ dayOfWeek: startDayOfWeek.toString(), time: timeStr }];
  }

  let targetEndDateObj: Date | null = null;
  if (repeatMode === 'weekly' && endMode === 'date' && endDateStr) {
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    targetEndDateObj = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59));
  }

  const bookingsToInsert = [];
  let weeksProcessed = 0;
  const maxLoops = 52; 

  while (weeksProcessed < maxLoops) {
    if (repeatMode === 'none' && weeksProcessed >= 1) break;
    if (repeatMode === 'weekly' && endMode === 'count' && weeksProcessed >= repeatCount) break;

    for (const session of schedule) {
      const dayDiff = Number(session.dayOfWeek) - startDayOfWeek;
      const daysToAdd = (weeksProcessed * 7) + dayDiff;
      
      if (weeksProcessed === 0 && dayDiff < 0) continue;

      const sessionDate = new Date(baseDate.getTime());
      sessionDate.setUTCDate(sessionDate.getUTCDate() + daysToAdd);

      if (repeatMode === 'weekly' && endMode === 'date' && targetEndDateObj && sessionDate > targetEndDateObj) {
          continue; 
      }

      // 生成安全的 YYYY-MM-DD
      const localDateStr = `${sessionDate.getUTCFullYear()}-${String(sessionDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sessionDate.getUTCDate()).padStart(2, '0')}`;
      const offset = getNZOffset(localDateStr);
      
      // 🚀 组装绝对时间戳 (例如: 2026-05-03T10:00:00+12:00)
      const startDateTimeStr = `${localDateStr}T${session.time}:00${offset}`;
      const startDateObjParsed = new Date(startDateTimeStr);
      const endDateTimeStr = new Date(startDateObjParsed.getTime() + duration * 60 * 60 * 1000).toISOString();

      bookingsToInsert.push({
        student_id: studentId,
        start_time: startDateTimeStr, // 直接丢给数据库解析
        end_time: endDateTimeStr,
        duration: duration,
        location: location,
        business_unit_id: businessId,
        status: 'confirmed',
        subject: subject || null,
        teacher: teacher || null,
        notes: notes || null
      });
    }

    if (repeatMode === 'weekly' && endMode === 'date' && targetEndDateObj) {
      const endOfWeek = new Date(baseDate.getTime());
      endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (weeksProcessed * 7) + 6);
      if (endOfWeek > targetEndDateObj) break;
    }

    weeksProcessed++;
  }

  const { error } = await supabase.from("bookings").insert(bookingsToInsert);
  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  return { success: true };
}

// 2. 更新预约
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

// 3. 完成预约
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

// 4. 取消预约
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

// 5. 删除预约
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

// 6. 驾校极速排课 - ✅ 同步修复
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

  if (!identifier || !dateStr) return { error: "信息不完整" };

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

  // 🧠 纯数学推算
  const [year, month, day] = dateStr.split('-').map(Number);
  const baseDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); 
  const startDayOfWeek = baseDate.getUTCDay(); 

  let schedule: { dayOfWeek: string, time: string }[] = [];
  if (repeatMode === 'weekly') {
      const wsStr = formData.get("weeklySchedule") as string;
      if (wsStr) {
          try { schedule = JSON.parse(wsStr); } catch(e) {}
      }
  } else {
      schedule = [{ dayOfWeek: startDayOfWeek.toString(), time: timeStr }];
  }

  let targetEndDateObj: Date | null = null;
  if (repeatMode === 'weekly' && endMode === 'date' && endDateStr) {
    const [ey, em, ed] = endDateStr.split('-').map(Number);
    targetEndDateObj = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59));
  }

  const bookingsToInsert = [];
  let weeksProcessed = 0;
  const maxLoops = 52; 

  while (weeksProcessed < maxLoops) {
    if (repeatMode === 'none' && weeksProcessed >= 1) break;
    if (repeatMode === 'weekly' && endMode === 'count' && weeksProcessed >= repeatCount) break;

    for (const session of schedule) {
      const dayDiff = Number(session.dayOfWeek) - startDayOfWeek;
      const daysToAdd = (weeksProcessed * 7) + dayDiff;
      
      if (weeksProcessed === 0 && dayDiff < 0) continue;

      const sessionDate = new Date(baseDate.getTime());
      sessionDate.setUTCDate(sessionDate.getUTCDate() + daysToAdd);

      if (repeatMode === 'weekly' && endMode === 'date' && targetEndDateObj && sessionDate > targetEndDateObj) {
          continue; 
      }

      const localDateStr = `${sessionDate.getUTCFullYear()}-${String(sessionDate.getUTCMonth() + 1).padStart(2, '0')}-${String(sessionDate.getUTCDate()).padStart(2, '0')}`;
      const offset = getNZOffset(localDateStr);
      
      const startDateTimeStr = `${localDateStr}T${session.time}:00${offset}`;
      const startDateObjParsed = new Date(startDateTimeStr);
      const endDateTimeStr = new Date(startDateObjParsed.getTime() + duration * 60 * 60 * 1000).toISOString();

      bookingsToInsert.push({
        student_id: studentId,
        start_time: startDateTimeStr,
        end_time: endDateTimeStr,
        duration: duration,
        location: location,
        business_unit_id: businessId,
        status: 'confirmed',
        actual_rate: actualRate,
        subject: subject || null,
        notes: notes || null,
        metadata: metadata
      });
    }

    if (repeatMode === 'weekly' && endMode === 'date' && targetEndDateObj) {
      const endOfWeek = new Date(baseDate.getTime());
      endOfWeek.setUTCDate(endOfWeek.getUTCDate() + (weeksProcessed * 7) + 6);
      if (endOfWeek > targetEndDateObj) break;
    }

    weeksProcessed++;
  }

  const { error } = await supabase.from("bookings").insert(bookingsToInsert);
  if (error) return { error: error.message };
  
  revalidatePath("/bookings");
  revalidatePath("/students");
  return { success: true };
}