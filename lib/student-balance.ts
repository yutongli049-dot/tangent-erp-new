import type { SupabaseClient } from "@supabase/supabase-js";
import { roundHours } from "@/lib/utils";

/** 原子增减学员课时（依赖 Supabase RPC increment_student_balance） */
export async function incrementStudentBalance(
  supabase: SupabaseClient,
  studentId: string,
  hoursDelta: number
): Promise<{ error?: string }> {
  const { error } = await supabase.rpc("increment_student_balance", {
    row_id: studentId,
    x: roundHours(hoursDelta),
  });
  if (error) return { error: error.message };
  return {};
}
