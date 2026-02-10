import { createClient } from "@/lib/supabase/server";

// ✅ 1. 强制动态模式：禁止 Next.js 缓存这个路由
export const dynamic = "force-dynamic"; 

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const supabase = await createClient();

  // 1. 查询课程
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`*, student:students(name)`)
    .eq("business_unit_id", businessId)
    .neq("status", "cancelled");

  if (!bookings) {
    return new Response("No bookings found", { status: 404 });
  }

  // 2. 生成 ICS 内容
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tangent ERP//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tangent Schedule",
    "X-WR-TIMEZONE:Pacific/Auckland",
    // ✅ 2. 刷新建议：建议客户端每 15 分钟刷新一次 (P15M = Period 15 Minutes)
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M", 
    "X-PUBLISHED-TTL:PT15M",
  ];

  // 格式化函数：YYYYMMDDTHHmmssZ
  const formatUTC = (date: Date) => {
    // 确保处理无效日期
    if (isNaN(date.getTime())) return "";
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  bookings.forEach((booking) => {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    // 如果日期无效，跳过
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

    icsContent.push("BEGIN:VEVENT");
    // ✅ 3. SEQUENCE: 如果你的 booking 表有 updated_at，最好用来做 sequence，没有的话也没关系
    icsContent.push(`UID:${booking.id}`);
    icsContent.push(`DTSTAMP:${formatUTC(new Date())}`); // 生成时间
    icsContent.push(`DTSTART:${formatUTC(startDate)}`);
    icsContent.push(`DTEND:${formatUTC(endDate)}`);
    icsContent.push(`SUMMARY:${booking.student?.name || "课程"} - ${booking.status === 'completed' ? '已完成' : '待进行'}`);
    
    if (booking.location) {
      icsContent.push(`LOCATION:${booking.location}`);
    }
    
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  // 3. 返回文件
  return new Response(icsContent.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tangent-schedule.ics"`,
      // ✅ 4. 核心 HTTP 头：禁止任何形式的缓存
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}