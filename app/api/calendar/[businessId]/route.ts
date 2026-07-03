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

  const calendar = ical({
    name: `Tangent Schedule (${businessId.toUpperCase()})`,
    prodId: { company: "Tangent ERP", product: "Calendar", language: "EN" },
    timezone: "UTC",
    ttl: 900,
  });

  for (const booking of bookings || []) {
    // 数据库 ISO 字符串 → 绝对 UTC Date（订阅端不发生偏移）
    const start = new Date(booking.start_time);
    const end = new Date(booking.end_time);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;

    const student = booking.student;
    const studentCode = student?.student_code || "无编号";
    const studentName = student?.name || "未知学员";
    const teacherName = booking.teacher || student?.teacher || "无老师";
    const notes = booking.notes || "无";
    const statusLabel = booking.status === "completed" ? "已完成" : "待进行";

    const summaryText = `${studentCode} ${studentName} ${teacherName}`;
    const placeLabel = booking.location?.trim() || "未指定";
    const locationWithTz = `${placeLabel} | ${formatDualTime(booking.start_time)}`;

    calendar.createEvent({
      id: booking.id,
      start,
      end,
      summary: summaryText,
      description: [
        `学员: ${studentName}`,
        `编号: ${studentCode}`,
        `老师: ${teacherName}`,
        `地点: ${booking.location || "未指定"}`,
        `备注: ${notes}`,
        `状态: ${statusLabel}`,
      ].join("\n"),
      location: locationWithTz,
      lastModified: new Date(),
    });  }

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
