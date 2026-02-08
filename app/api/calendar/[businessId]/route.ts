import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> } // ✅ 修复1：这里必须是 businessId，匹配你的文件夹名
) {
  const { businessId } = await params; // ✅ 修复2：解构出 businessId
  const supabase = await createClient();

  // 1. 查询课程
  // 这里假设 URL 里的 ID 就是 business_unit_id，用于订阅该公司的所有课程
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`*, student:students(name)`)
    .eq("business_unit_id", businessId) // ✅ 使用 businessId 进行过滤
    .neq("status", "cancelled");

  if (!bookings) {
    return new Response("No bookings found", { status: 404 });
  }

  // 2. 生成 ICS 内容 (包含之前的时区修复)
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tangent ERP//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tangent Schedule",
    "X-WR-TIMEZONE:Pacific/Auckland",
  ];

  bookings.forEach((booking) => {
    // ✅ 时区修复逻辑：强制转为 UTC 格式 (末尾加 Z)
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    // 格式化函数：YYYYMMDDTHHmmssZ
    const formatUTC = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${booking.id}`);
    icsContent.push(`DTSTAMP:${formatUTC(new Date())}`);
    icsContent.push(`DTSTART:${formatUTC(startDate)}`); // ✅ UTC 时间
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
    },
  });
}