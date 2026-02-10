import { createClient } from "@/lib/supabase/server";

// ✅ 1. 核心：强制动态模式，防止苹果日历读到旧缓存
export const dynamic = "force-dynamic"; 

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const supabase = await createClient();

  console.log(`Calendar Request for: ${businessId}`);

  // 2. 构建查询
  let query = supabase
    .from("bookings")
    .select(`*, student:students(name)`) // 关联查学生姓名
    .neq("status", "cancelled");         // 排除已取消的

  // ✅ 3. 逻辑修正：直接用 URL 参数查库
  // 截图证明数据库存的就是 "cus"，所以 URL 里的 "cus" 直接拿来用就行，不需要翻译。
  // 只有当参数是 "tangent" (总部视角) 时，才不加过滤条件，返回所有。
  if (businessId !== "tangent") {
    query = query.eq("business_unit_id", businessId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error("Calendar DB Error:", error);
  }

  // 如果没查到数据，返回一个合法的空日历，否则苹果会报错
  const safeBookings = bookings || [];

  // 4. 生成 ICS 内容
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tangent ERP//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:Tangent Schedule (${businessId.toUpperCase()})`, // 日历名称
    "X-WR-TIMEZONE:Pacific/Auckland", // 声明时区
    "REFRESH-INTERVAL;VALUE=DURATION:PT15M", // 建议 15 分钟刷新
    "X-PUBLISHED-TTL:PT15M",
  ];

  // 时间格式化函数 (UTC)
  const formatUTC = (date: Date) => {
    if (isNaN(date.getTime())) return "";
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  safeBookings.forEach((booking) => {
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return;

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${booking.id}`);
    icsContent.push(`DTSTAMP:${formatUTC(new Date())}`);
    icsContent.push(`DTSTART:${formatUTC(startDate)}`);
    icsContent.push(`DTEND:${formatUTC(endDate)}`);
    
    // 标题：区分一下来源，方便你看
    const prefix = booking.business_unit_id === 'sine' ? '[驾校]' : 
                   booking.business_unit_id === 'cus' ? '[教培]' : '';
    
    icsContent.push(`SUMMARY:${prefix} ${booking.student?.name || "学员"} - ${booking.status === 'completed' ? '已完成' : '待进行'}`);
    
    if (booking.location) {
      icsContent.push(`LOCATION:${booking.location}`);
    }
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  // 5. 返回文件，带防缓存头
  return new Response(icsContent.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tangent-${businessId}.ics"`,
      // ✅ 禁缓存三连
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}