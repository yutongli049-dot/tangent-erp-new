import { createClient } from "@supabase/supabase-js";
import ical from "ical-generator";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;

  // ✅ 核心修改：优先使用 Service Role Key (万能钥匙)
  // 这样即使日历 APP 没有登录，也能读取到排课数据
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  // 查询该公司的所有"确认"的预约
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students ( name )
    `)
    .eq("business_unit_id", businessId)
    .neq("status", "cancelled");

  if (error) {
    console.error("Calendar API Error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }

  // 创建日历
  const calendar = ical({
    name: `Tangent ERP - ${businessId === 'sine' ? 'Sine Studio' : 'CuS Academy'}`,
    timezone: 'Pacific/Auckland',
  });

  // 即使没有课程，也要返回一个空日历，而不是报错
  bookings?.forEach((b) => {
    const studentName = b.student?.name || "未知学员";
    calendar.createEvent({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
      summary: `课程: ${studentName}`,
      description: `学员: ${studentName}\n备注: ${b.notes || '无'}\nZoom: ${b.meeting_url || '无'}`,
      location: b.location || b.meeting_url || "线上",
      url: b.meeting_url || undefined,
    });
  });

  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendar-${businessId}.ics"`,
    },
  });
}