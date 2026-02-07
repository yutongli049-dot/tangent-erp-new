import { createClient } from "@supabase/supabase-js"; // 注意：API 路由里我们用纯 JS 客户端
import ical from "ical-generator";

// 初始化一个绕过 RLS 的超级客户端 (为了让日历应用能直接读取)
// 注意：这里需要你的 Service Role Key (在 Supabase 设置里找)，或者为了 MVP 简单，
// 我们暂时用 Anon Key，但前提是你得把 bookings 表的 select 权限放开给所有人 (或者我们在查询时不做鉴权)
// 为了安全起见，MVP 阶段建议：
// 1. 暂时用 createClient(url, anon_key)
// 2. 确保你的 URL 是隐蔽的

export async function GET(
  request: Request,
  { params }: { params: { businessId: string } }
) {
  const { businessId } = await params;

  // 1. 初始化 Supabase (这里用服务端客户端)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 2. 查询该公司的所有"确认"的预约
  // 这里我们关联查询 student 表，为了在日历标题里显示学员名字
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      *,
      student:students ( name )
    `)
    .eq("business_unit_id", businessId)
    .neq("status", "cancelled"); // 不显示已取消的

  // 3. 创建日历对象
  const calendar = ical({
    name: `Tangent ERP - ${businessId === 'sine' ? 'Sine Studio' : 'CuS Academy'}`,
    timezone: 'Pacific/Auckland',
  });

  // 4. 遍历预约，添加到日历
  bookings?.forEach((b) => {
    const studentName = b.student?.name || "未知学员";
    
    calendar.createEvent({
      start: new Date(b.start_time),
      end: new Date(b.end_time),
      summary: `课程: ${studentName}`, // 日历标题
      description: `
        学员: ${studentName}
        备注: ${b.notes || '无'}
        Zoom/会议链接: ${b.meeting_url || '无'}
      `, // 日历备注
      location: b.location || b.meeting_url || "线上",
      url: b.meeting_url || undefined, // 这一步让苹果日历能直接点击跳转
    });
  });

  // 5. 返回 .ics 文件流
  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="calendar-${businessId}.ics"`,
    },
  });
}