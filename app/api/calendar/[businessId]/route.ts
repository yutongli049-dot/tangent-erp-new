import { createClient } from "@supabase/supabase-js";
import ical from "ical-generator";

// ✅ 修复点：将 params 的类型定义为 Promise
export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  // 1. 等待 params 解析 (Next.js 15+ 要求)
  const { businessId } = await params;

  // 2. 初始化 Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 3. 查询该公司的所有"确认"的预约
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students ( name )
    `)
    .eq("business_unit_id", businessId)
    .neq("status", "cancelled");

  // 4. 创建日历对象
  const calendar = ical({
    name: `Tangent ERP - ${businessId === 'sine' ? 'Sine Studio' : 'CuS Academy'}`,
    timezone: 'Pacific/Auckland',
  });

  // 5. 遍历预约，添加到日历
  bookings?.forEach((b) => {
    const studentName = b.student?.name || "未知学员";
    
    calendar.createEvent({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
      summary: `课程: ${studentName}`,
      description: `
        学员: ${studentName}
        备注: ${b.notes || '无'}
        Zoom/会议链接: ${b.meeting_url || '无'}
      `,
      location: b.location || b.meeting_url || "线上",
      url: b.meeting_url || undefined,
    });
  });

  // 6. 返回 .ics 文件流
  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendar-${businessId}.ics"`,
    },
  });
}