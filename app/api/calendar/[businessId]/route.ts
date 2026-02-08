// app/api/calendar/[token]/route.ts
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> } // Next.js 15+ params is a Promise
) {
  const { token } = await params;
  const supabase = await createClient();

  // 1. 验证 Token (这部分逻辑假设你之前是这么写的)
  // 如果你有专门的 calendar_tokens 表，请查那个表。
  // 这里假设简单验证：查找是否有用户的 id 等于 token (极简版)，或者你需要查 users 表
  // 为了安全，建议你之前是查一个专门的 tokens 表。这里我保留核心的 ICS 生成逻辑。
  
  // 这里我们假设 token 就是 userId，或者你能通过 token 换到 userId
  // ⚠️ 请根据你之前的实际鉴权逻辑调整这一行
  const userId = token; 

  // 2. 查课程
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`*, student:students(name)`)
    // 假设你通过某种方式关联到了 business_unit_id 或者直接查 bookings
    // 这里为了演示修复时区，假设我们查到了该用户相关的所有 bookings
    .neq("status", "cancelled");

  if (!bookings) {
    return new Response("No bookings found", { status: 404 });
  }

  // 3. 生成 ICS 内容
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tangent ERP//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Tangent Schedule",
    "X-WR-TIMEZONE:Pacific/Auckland", // 建议加上这个，虽然有 UTC 时间就够了，但加个提示也好
  ];

  bookings.forEach((booking) => {
    // ✅ 核心修复：确保时间格式为 UTC (末尾带 Z)
    // 数据库存的是 UTC (例如 2026-02-08T04:00:00+00:00)
    // new Date(...) 在 Vercel (UTC环境) 会解析正确
    
    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);

    // 格式化函数：YYYYMMDDTHHmmssZ
    const formatUTC = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${booking.id}`);
    icsContent.push(`DTSTAMP:${formatUTC(new Date())}`); // 生成时间
    icsContent.push(`DTSTART:${formatUTC(startDate)}`); // ✅ 这里输出的会是 ...040000Z
    icsContent.push(`DTEND:${formatUTC(endDate)}`);
    icsContent.push(`SUMMARY:${booking.student?.name || "课程"} - ${booking.status === 'completed' ? '已完成' : '待进行'}`);
    if (booking.location) {
      icsContent.push(`LOCATION:${booking.location}`);
    }
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  // 4. 返回文件
  return new Response(icsContent.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="tangent-schedule.ics"`,
    },
  });
}