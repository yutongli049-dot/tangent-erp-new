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
