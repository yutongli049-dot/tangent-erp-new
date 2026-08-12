import {
  formatSineIcsDescription,
  formatSineIcsSummary,
} from "@/lib/driving-booking-text";
import { createClient } from "@supabase/supabase-js";
import ical from "ical-generator";
import { formatDualTime } from "@/lib/timezone";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let query = supabase
    .from("bookings")
    .select(`
      *,
      student:students(name, student_code, teacher)
    `)
    .neq("status", "cancelled");

  if (businessId !== "tangent") {
    query = query.eq("business_unit_id", businessId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error("Calendar DB Error:", error);
    return new Response("Database Error", { status: 500 });
  }

  const isSine = businessId === "sine";

  const calendar = ical({
    name: isSine ? "Sine Driving School" : `Tangent Schedule (${businessId.toUpperCase()})`,
    prodId: { company: "Tangent ERP", product: "Calendar", language: "EN" },
    timezone: "UTC",
    ttl: 900,
  });

  for (const booking of bookings || []) {
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    const student = booking.student;
    const studentCode = student?.student_code || "无编号";
    const studentName = student?.name || "未知学员";
    const teacherName = booking.teacher || student?.teacher || "无老师";
    const notes = booking.notes || "";
    const statusLabel = booking.status === "completed" ? "已完成" : "待进行";
    const placeLabel = booking.location?.trim() || "未指定";
    const locationWithTz = `${placeLabel} | ${formatDualTime(booking.start_time)}`;
    const metadata = (booking.metadata as Record<string, unknown> | null) ?? {};

    let summaryText: string;
    let descriptionText: string;

    if (isSine) {
      summaryText = formatSineIcsSummary({
        subject: booking.subject,
        studentCode,
        studentName,
        metadata,
        actualRate: booking.actual_rate,
        duration: booking.duration,
      });
      descriptionText = formatSineIcsDescription({
        subject: booking.subject,
        studentCode,
        studentName,
        location: booking.location,
        notes,
        status: booking.status,
        metadata,
        actualRate: booking.actual_rate,
        duration: booking.duration,
        startTimeLabel: formatDualTime(booking.start_time),
      });
    } else {
      summaryText = `${studentCode} ${studentName} ${teacherName}`;
      descriptionText = [
        `学员: ${studentName}`,
        `编号: ${studentCode}`,
        `老师: ${teacherName}`,
        `地点: ${placeLabel}`,
        `备注: ${notes || "无"}`,
        `状态: ${statusLabel}`,
      ].join("\n");
    }

    calendar.createEvent({
      id: booking.id,
      start,
      end,
      summary: summaryText,
      description: descriptionText,
      location: locationWithTz,
      lastModified: new Date(),
    });
  }

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tangent-${businessId}.ics"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });
}
