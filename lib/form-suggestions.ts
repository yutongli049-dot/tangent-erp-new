import type { SupabaseClient } from "@supabase/supabase-js";

function dedupeSorted(values: (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) set.add(trimmed);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** 从学员表与排课记录中提取去重后的科目 / 老师 / 地点 */
export async function fetchFormSuggestions(
  supabase: SupabaseClient,
  businessId: string
): Promise<{ subjects: string[]; teachers: string[]; locations: string[] }> {
  const [studentsRes, bookingsRes] = await Promise.all([
    supabase
      .from("students")
      .select("subject, teacher")
      .eq("business_unit_id", businessId),
    supabase
      .from("bookings")
      .select("subject, teacher, location")
      .eq("business_unit_id", businessId),
  ]);

  const subjects = dedupeSorted([
    ...(studentsRes.data ?? []).map((r) => r.subject),
    ...(bookingsRes.data ?? []).map((r) => r.subject),
  ]);

  const teachers = dedupeSorted([
    ...(studentsRes.data ?? []).map((r) => r.teacher),
    ...(bookingsRes.data ?? []).map((r) => r.teacher),
  ]);

  const locations = dedupeSorted(
    (bookingsRes.data ?? []).map((r) => r.location)
  );

  return { subjects, teachers, locations };
}

export const DEFAULT_TUTORING_LOCATIONS = ["2 Bently Ave", "线上"];

export function mergeLocationOptions(
  suggestions: string[],
  defaults: string[] = DEFAULT_TUTORING_LOCATIONS
): string[] {
  return dedupeSorted([...defaults, ...suggestions]);
}

export function sortByStudentCode<T extends { student_code?: string | null }>(
  list: T[]
): T[] {
  return [...list].sort((a, b) =>
    (a.student_code ?? "").localeCompare(b.student_code ?? "", undefined, {
      numeric: true,
    })
  );
}

export type StudentWithMeta = {
  id: string;
  name: string;
  student_code: string | null;
  subject?: string | null;
};

export type DrivingLastBookingPref = {
  location: string | null;
  actualRate: number | null;
  duration: number | null;
  startTime: string | null;
  useInstructorCar: boolean | null;
  coach: string | null;
  subject: string | null;
  needPickup: boolean;
  pickupAddress: string | null;
  plateNumber: string | null;
};

export type DrivingStudentPrefill = {
  id: string;
  name: string;
  student_code: string | null;
  lastBooking: DrivingLastBookingPref | null;
};

function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[%_,()]/g, " ").trim();
}

function shortPlaceLabel(location?: string | null): string {
  const raw = location?.trim();
  if (!raw) return "无地点";
  const vtnz = raw.match(/^(VTNZ\s+[^,(]+)/i);
  if (vtnz?.[1]) return vtnz[1].replace(/^VTNZ\s+/i, "").trim();
  return raw.split(",")[0]?.trim() || raw;
}

export function formatDrivingPrefillSummary(row: DrivingStudentPrefill): string {
  const code = row.student_code?.trim();
  const title = [code, row.name].filter(Boolean).join(" ");
  const last = row.lastBooking;
  if (!last) return `${title} · 暂无历史排课`;

  const place = shortPlaceLabel(last.location);
  const car =
    last.useInstructorCar === true
      ? "教练车"
      : last.useInstructorCar === false
        ? "自己车"
        : null;
  const rate =
    last.actualRate != null && Number(last.actualRate) > 0
      ? `$${Number(last.actualRate)}`
      : null;
  const bits = [place, car, rate].filter(Boolean);
  return `${title} · 上次：${bits.join(" / ")}`;
}

/** 按编号/姓名联想学员，并附带最近一次非取消排课偏好 */
export async function searchDrivingStudentsWithLastBooking(
  supabase: SupabaseClient,
  businessId: string,
  query: string,
  limit = 12
): Promise<DrivingStudentPrefill[]> {
  const q = sanitizeSearchTerm(query);
  let studentQuery = supabase
    .from("students")
    .select("id, name, student_code")
    .eq("business_unit_id", businessId)
    .order("student_code", { ascending: true })
    .limit(limit);

  if (q) {
    studentQuery = studentQuery.or(
      `student_code.ilike.%${q}%,name.ilike.%${q}%`
    );
  }

  const { data: students, error } = await studentQuery;
  if (error || !students?.length) return [];

  const ids = students.map((s) => s.id);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("student_id, location, actual_rate, duration, start_time, subject, metadata")
    .eq("business_unit_id", businessId)
    .in("student_id", ids)
    .neq("status", "cancelled")
    .order("start_time", { ascending: false });

  type LastBookingRow = {
    student_id: string | null;
    location: string | null;
    actual_rate: number | null;
    duration: number | null;
    start_time: string | null;
    subject: string | null;
    metadata: Record<string, unknown> | null;
  };

  const lastByStudent = new Map<string, LastBookingRow>();
  for (const b of (bookings ?? []) as LastBookingRow[]) {
    if (b.student_id && !lastByStudent.has(b.student_id)) {
      lastByStudent.set(b.student_id, b);
    }
  }

  return students.map((s) => {
    const last = lastByStudent.get(s.id);
    const meta = (last?.metadata ?? null) as Record<string, unknown> | null;
    return {
      id: s.id,
      name: s.name,
      student_code: s.student_code,
      lastBooking: last
        ? {
            location: last.location ?? null,
            actualRate:
              last.actual_rate != null ? Number(last.actual_rate) : null,
            duration: last.duration != null ? Number(last.duration) : null,
            startTime: last.start_time ?? null,
            useInstructorCar:
              typeof meta?.useInstructorCar === "boolean"
                ? meta.useInstructorCar
                : null,
            coach: meta?.coach != null ? String(meta.coach) : null,
            subject: last.subject ?? null,
            needPickup: meta?.needPickup === true,
            pickupAddress:
              meta?.pickupAddress != null ? String(meta.pickupAddress) : null,
            plateNumber:
              meta?.plateNumber != null ? String(meta.plateNumber) : null,
          }
        : null,
    };
  });
}

/** 近一月有排课 = 活跃；否则沉寂 */
export function partitionStudentsByActivity(
  students: StudentWithMeta[],
  activeStudentIds: Set<string>
): { active: StudentWithMeta[]; inactive: StudentWithMeta[] } {
  const active: StudentWithMeta[] = [];
  const inactive: StudentWithMeta[] = [];

  for (const s of students) {
    if (activeStudentIds.has(s.id)) active.push(s);
    else inactive.push(s);
  }

  return {
    active: sortByStudentCode(active),
    inactive: sortByStudentCode(inactive),
  };
}
