import { createClient } from "@supabase/supabase-js";

// 1. 强制动态模式 (防缓存)
export const dynamic = "force-dynamic"; 

export async function GET(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;

  console.log(`Calendar Request for: ${businessId}`);

  // 2. 初始化 Supabase (使用 Service Role Key 绕过 RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! 
  );

  // 3. 构建查询
  let query = supabase
    .from("bookings")
    // ✅ 修改点1：多查 student_code 和 teacher
    .select(`
      *, 
      student:students(name, student_code, teacher)
    `) 
    .neq("status", "cancelled"); 

  // 4. 处理 ID
  if (businessId !== "tangent") {
    query = query.eq("business_unit_id", businessId);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error("Calendar DB Error:", error);
    return new Response("Database Error", { status: 500 });
  }

  const safeBookings = bookings || [];

  // 5. 生成 ICS 内容
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

    // ✅ 修改点2：拼接标题格式 "学生编号 学生名字 老师名字"
    const student = booking.student;
    const studentCode = student?.student_code || "无编号"; // 处理空值
    const studentName = student?.name || "未知学员";
    const teacherName = student?.teacher || "无老师";
    
    // 最终格式：S202301 Sophia Alex
    const summaryText = `${studentCode} ${studentName} ${teacherName}`;

    icsContent.push("BEGIN:VEVENT");
    icsContent.push(`UID:${booking.id}`);
    icsContent.push(`DTSTAMP:${formatUTC(new Date())}`);
    icsContent.push(`DTSTART:${formatUTC(startDate)}`);
    icsContent.push(`DTEND:${formatUTC(endDate)}`);
    
    // 写入 SUMMARY
    icsContent.push(`SUMMARY:${summaryText}`);
    
    // 描述里也保留详细信息
    icsContent.push(`DESCRIPTION:学员: ${studentName}\\n老师: ${teacherName}\\n编号: ${studentCode}\\n状态: ${booking.status === 'completed' ? '已完成' : '待进行'}`);
    
    if (booking.location) {
      icsContent.push(`LOCATION:${booking.location}`);
    }
    icsContent.push("END:VEVENT");
  });

  icsContent.push("END:VCALENDAR");

  // 6. 返回
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