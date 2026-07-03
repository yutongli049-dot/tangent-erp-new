"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { durationToMs, roundHours } from "@/lib/utils";
import {
  addCalendarDaysInNZ,
  addCalendarMonthsInNZ,
  getDayOfWeekInNZ,
  nzEndOfDayUtc,
  nzLocalToUtc,
} from "@/lib/timezone";
import {
  getWeekStep,
  isRecurringMode,
  normalizeRepeatMode,
  shouldParseWeeklySchedule,
} from "@/lib/recurrence";

type WeeklySession = { dayOfWeek: string; time: string };

/** 循环排课：新西兰本地时间 → UTC ISO 会话列表 */
function buildBookingSessions(params: {
  dateStr: string;
  timeStr: string;
  repeatMode: string;
  endMode: string;
  repeatCount: number;
  endDateStr: string;
  weeklySchedule: WeeklySession[];
  customIntervalWeeks: number;
  duration: number;
}): { start_time: string; end_time: string; duration: number }[] {
  const {
    dateStr,
    timeStr,
    repeatMode: rawMode,
    endMode,
    repeatCount,
    endDateStr,
    weeklySchedule,
    customIntervalWeeks,
    duration,
  } = params;

  const repeatMode = normalizeRepeatMode(rawMode);
  const recurring = isRecurringMode(repeatMode);

  let schedule: WeeklySession[] = [];
  if (shouldParseWeeklySchedule(repeatMode)) {
    schedule = weeklySchedule.length > 0 ? weeklySchedule : [{ dayOfWeek: getDayOfWeekInNZ(dateStr).toString(), time: timeStr }];
  } else {
    schedule = [{ dayOfWeek: getDayOfWeekInNZ(dateStr).toString(), time: timeStr }];
  }

  const startDayOfWeek = getDayOfWeekInNZ(dateStr);
  const targetEndUtc =
    recurring && endMode === "date" && endDateStr
      ? nzEndOfDayUtc(endDateStr)
      : null;

  const sessions: { start_time: string; end_time: string; duration: number }[] = [];
  let iteration = 0;
  const maxIterations = repeatMode === "monthly" ? 24 : 52;
  const weekStep = getWeekStep(repeatMode, customIntervalWeeks);

  const pushSession = (localDateStr: string, sessionTime: string) => {
    const startDateTime = nzLocalToUtc(localDateStr, sessionTime);
    if (targetEndUtc && startDateTime > targetEndUtc) return false;

    const endDateTime = new Date(startDateTime.getTime() + durationToMs(duration));
    sessions.push({
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      duration,
    });
    return true;
  };

  while (iteration < maxIterations) {
    if (repeatMode === "none" && iteration >= 1) break;
    if (recurring && endMode === "count" && iteration >= repeatCount) break;

    if (repeatMode === "monthly") {
      const localDateStr = addCalendarMonthsInNZ(dateStr, iteration);
      pushSession(localDateStr, timeStr);
    } else {
      for (const session of schedule) {
        const dayDiff = Number(session.dayOfWeek) - startDayOfWeek;
        const daysToAdd = iteration * 7 * weekStep + dayDiff;
        if (iteration === 0 && dayDiff < 0) continue;

        const localDateStr = addCalendarDaysInNZ(dateStr, daysToAdd);
        pushSession(localDateStr, session.time);
      }

      if (targetEndUtc) {
        const endOfPeriodStr = addCalendarDaysInNZ(
          dateStr,
          iteration * 7 * weekStep + 6
        );
        if (nzEndOfDayUtc(endOfPeriodStr) > targetEndUtc) break;
      }
    }

    if (repeatMode === "none") break;
    iteration++;
  }

  return sessions;
}

function parseWeeklySchedule(formData: FormData, repeatMode: string): WeeklySession[] {
  if (!shouldParseWeeklySchedule(repeatMode)) return [];
  const wsStr = formData.get("weeklySchedule") as string;
  if (!wsStr) return [];
  try {
    return JSON.parse(wsStr) as WeeklySession[];
  } catch {
    return [];
  }
}

function parseCustomIntervalWeeks(formData: FormData): number {
  const n = Number(formData.get("customIntervalWeeks"));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 52) : 1;
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

  const repeatMode = (formData.get("repeatMode") as string) || "none";
  const endMode = (formData.get("endMode") as string) || "count";
  const repeatCount = Number(formData.get("repeatCount")) || 1;
  const endDateStr = formData.get("endDate") as string;

  if (!studentId || !dateStr) return { error: "信息不完整" };

  const sessionSlots = buildBookingSessions({
    dateStr,
    timeStr,
    repeatMode,
    endMode,
    repeatCount,
    endDateStr,
    weeklySchedule: parseWeeklySchedule(formData, repeatMode),
    customIntervalWeeks: parseCustomIntervalWeeks(formData),
    duration,
  });

  const bookingsToInsert = sessionSlots.map((slot) => ({
    ...slot,
    student_id: studentId,
    location,
    business_unit_id: businessId,
    status: "confirmed",
    subject: subject || null,
    teacher: teacher || null,
    notes: notes || null,
  }));

  const { error } = await supabase.from("bookings").insert(bookingsToInsert);
  if (error) return { error: error.message };

  revalidatePath("/bookings");
  return { success: true };
}

// 2. 更新预约 — 接收新西兰本地 date + time，存储 UTC
export async function updateBooking(
  id: string,
  data: { date: string; time: string; duration: number; location: string }
) {
  const supabase = await createClient();
  const startDate = nzLocalToUtc(data.date, data.time);
  const endDate = new Date(startDate.getTime() + durationToMs(data.duration));

  const { error } = await supabase.from("bookings").update({
    start_time: startDate.toISOString(),
    end_time: endDate.toISOString(),
    duration: data.duration,
    location: data.location,
  }).eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/bookings");
  return { success: true };
}

// 3. 完成预约
export async function completeBooking(id: string, studentId: string, duration: number) {
  const supabase = await createClient();
  const { error: bookingError } = await supabase.from("bookings").update({ status: "completed" }).eq("id", id);
  if (bookingError) return { error: bookingError.message };

  const { data: student } = await supabase.from("students").select("balance").eq("id", studentId).single();
  if (student) {
    await supabase.from("students").update({ balance: roundHours(Number(student.balance) - duration) }).eq("id", studentId);
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

  if (booking.status === "completed" && booking.student_id) {
    const { data: student } = await supabase.from("students").select("balance").eq("id", booking.student_id).single();
    if (student) {
      await supabase.from("students").update({ balance: roundHours(Number(student.balance) + Number(booking.duration)) }).eq("id", booking.student_id);
    }
  }

  const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
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
  if (booking && booking.status === "completed" && booking.student_id) {
    const { data: student } = await supabase.from("students").select("balance").eq("id", booking.student_id).single();
    if (student) {
      await supabase.from("students").update({ balance: roundHours(Number(student.balance) + Number(booking.duration)) }).eq("id", booking.student_id);
    }
  }

  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/students");
  revalidatePath("/finance");
  return { success: true };
}

// 6. 驾校极速排课
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

  const repeatMode = (formData.get("repeatMode") as string) || "none";
  const endMode = (formData.get("endMode") as string) || "count";
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
        hourly_rate: actualRate,
      })
      .select("id")
      .single();

    if (createError) return { error: "学员创建失败: " + createError.message };
    studentId = newStudent.id;
  }

  const sessionSlots = buildBookingSessions({
    dateStr,
    timeStr,
    repeatMode,
    endMode,
    repeatCount,
    endDateStr,
    weeklySchedule: parseWeeklySchedule(formData, repeatMode),
    customIntervalWeeks: parseCustomIntervalWeeks(formData),
    duration,
  });

  const bookingsToInsert = sessionSlots.map((slot) => ({
    ...slot,
    student_id: studentId,
    location,
    business_unit_id: businessId,
    status: "confirmed",
    actual_rate: actualRate,
    subject: subject || null,
    notes: notes || null,
    metadata,
  }));

  const { error } = await supabase.from("bookings").insert(bookingsToInsert);
  if (error) return { error: error.message };

  revalidatePath("/bookings");
  revalidatePath("/students");
  return { success: true };
}
