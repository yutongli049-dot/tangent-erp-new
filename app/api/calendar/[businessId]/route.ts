import { createClient } from "@supabase/supabase-js"; // ⚠️ 注意：这里直接用官方库，不封装

// 1. 强制动态模式 (防缓存)
export const dynamic = "force-dynamic"; 

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;

  console.log(`Calendar Request for: ${businessId}`);

  // ✅ 2. 初始化 Supabase (使用 Service Role Key)
  // 这里的关键是使用 SERVICE_ROLE_KEY，它拥有最高权限，可以绕过 RLS 限制
  // 苹果日历是未登录用户，必须用这个 key 才能查到受保护的数据
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ 确保你在 .env.local 里配了这个变量
  );

  // 3. 构建查询
  let query = supabase
    .from("bookings")
    .select(`*, student:students(name)`) 
    .neq("status", "cancelled"); 

  // 4. 处理 ID (直接用 URL 参数，因为数据库里存的就是 'cus' / 'sine')
  if (businessId !== "tangent") {
    query = query.eq("business_unit_id", businessId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error("Calendar DB Error:", error);
    return new Response("Database Error", { status: 500 });
  }

  const safeBookings = bookings || [];
  console.log(`Found ${safeBookings.length} bookings for ${businessId}`);

  // 5. 生成 ICS 内容 (手动生成，无需安装 ical-generator)
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tangent ERP//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Tangent Schedule (${businessId.toUpperCase()})`,
    "X-WR-TIMEZONE:Pacific/Auckland",
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M", 
    "X-PUBLISHED-TTL:PT15M",
  ];

  const formatUTC = (date: Date) => {
    if (isNaN(date.getTime())) return "";
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  safeBookings.forEach((booking) => {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

    // 标题处理
    const prefix = booking.business_unit_id === 'sine' ? '[驾校]' : 
                   booking.business_unit_id === 'cus' ? '[教培]' : '';
    const studentName = booking.student?.name || "学员";
    
    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${booking.id}`);
    icsContent.push(`DTSTAMP:${formatUTC(new Date())}`);
    icsContent.push(`DTSTART:${formatUTC(startDate)}`);
    icsContent.push(`DTEND:${formatUTC(endDate)}`);
    icsContent.push(`SUMMARY:${prefix} ${studentName}`);
    icsContent.push(`DESCRIPTION:学员: ${studentName}\\n状态: ${booking.status === 'completed' ? '已完成' : '待进行'}`);
    
    if (booking.location) {
      icsContent.push(`LOCATION:${booking.location}`);
    }
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  // 6. 返回 (带防缓存头)
  return new Response(icsContent.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tangent-${businessId}.ics"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}