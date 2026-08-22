/**
 * Sine 驾校历史财务对齐（一次性脚本）
 *
 * 1. 将所有 sine 学员 balance 归零（清除负课时异常）
 * 2. 为已完成但缺少 Tuition 流水的 booking 补写 income 流水
 *    （日期 = booking.start_time，金额 = actual_rate × duration）
 *
 * 用法:
 *   npx tsx scripts/align-sine-finance.ts              # Dry-Run（默认）
 *   npx tsx scripts/align-sine-finance.ts --write      # 真正写入
 *
 * 环境变量（--write 时需要）:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   IMPORT_CREATED_BY（可选，transactions.created_by）
 */

import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { lessonTuitionMarker } from "../lib/driving-settlement";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") });

const BUSINESS_ID = "sine";
const WRITE = process.argv.includes("--write");

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function resolveCreatedBy(supabase: SupabaseClient): Promise<string> {
  const fromEnv =
    process.env.IMPORT_CREATED_BY ||
    process.env.SUPABASE_IMPORT_USER_ID ||
    "";
  if (fromEnv.trim()) return fromEnv.trim();

  const { data: txRow } = await supabase
    .from("transactions")
    .select("created_by")
    .not("created_by", "is", null)
    .limit(1)
    .maybeSingle();
  if (txRow?.created_by) return String(txRow.created_by);

  const { data: authData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const userId = authData?.users?.[0]?.id;
  if (userId) return userId;

  throw new Error(
    "无法解析 transactions.created_by，请在 .env.local 设置 IMPORT_CREATED_BY=<uuid>"
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`\n=== Sine 财务对齐 ${WRITE ? "(WRITE)" : "(DRY-RUN)"} ===\n`);

  const { data: students, error: studentsErr } = await supabase
    .from("students")
    .select("id, name, student_code, balance")
    .eq("business_unit_id", BUSINESS_ID);

  if (studentsErr) throw new Error(studentsErr.message);

  const nonZeroBalance = (students ?? []).filter((s) => Number(s.balance) !== 0);
  console.log(`学员 balance 非零: ${nonZeroBalance.length} / ${students?.length ?? 0}`);
  for (const s of nonZeroBalance.slice(0, 10)) {
    console.log(`  · ${s.student_code || s.name}: ${s.balance}h → 0`);
  }
  if (nonZeroBalance.length > 10) {
    console.log(`  … 另有 ${nonZeroBalance.length - 10} 条`);
  }

  if (WRITE && nonZeroBalance.length > 0) {
    const { error: balanceErr } = await supabase
      .from("students")
      .update({ balance: 0 })
      .eq("business_unit_id", BUSINESS_ID);
    if (balanceErr) throw new Error(`balance 归零失败: ${balanceErr.message}`);
    console.log("✓ 已将 sine 全部学员 balance 设为 0");
  }

  const { data: bookings, error: bookingsErr } = await supabase
    .from("bookings")
    .select(`
      id, start_time, duration, actual_rate, student_id,
      student:students ( name, student_code, hourly_rate, currency )
    `)
    .eq("business_unit_id", BUSINESS_ID)
    .eq("status", "completed");

  if (bookingsErr) throw new Error(bookingsErr.message);

  const { data: tuitionTx, error: txErr } = await supabase
    .from("transactions")
    .select("id, description")
    .eq("business_unit_id", BUSINESS_ID)
    .eq("category", "Tuition")
    .eq("type", "income");

  if (txErr) throw new Error(txErr.message);

  const markerSet = new Set<string>();
  for (const tx of tuitionTx ?? []) {
    const match = String(tx.description ?? "").match(/\[booking:([^\]]+)\]/);
    if (match?.[1]) markerSet.add(match[1]);
  }

  type BookingRow = NonNullable<typeof bookings>[number];
  const missing: Array<{
    booking: BookingRow;
    amount: number;
    marker: string;
  }> = [];

  for (const booking of bookings ?? []) {
    if (markerSet.has(booking.id)) continue;

    const student = Array.isArray(booking.student)
      ? booking.student[0]
      : booking.student;
    const duration = Number(booking.duration) || 0;
    const rate = Number(booking.actual_rate ?? student?.hourly_rate ?? 85);
    const amount = round2(duration * rate);
    if (!(duration > 0) || !(amount > 0)) continue;

    missing.push({
      booking,
      amount,
      marker: lessonTuitionMarker(booking.id),
    });
  }

  console.log(`\n已完成 booking: ${bookings?.length ?? 0}`);
  console.log(`已有 Tuition 流水: ${markerSet.size}`);
  console.log(`待补写流水: ${missing.length}`);

  let previewTotal = 0;
  for (const row of missing.slice(0, 15)) {
    const student = Array.isArray(row.booking.student)
      ? row.booking.student[0]
      : row.booking.student;
    const id =
      student?.student_code || student?.name || row.booking.student_id || "?";
    previewTotal += row.amount;
    console.log(
      `  · ${row.booking.start_time?.slice(0, 10) ?? "?"} ${id} $${row.amount.toFixed(2)}`
    );
  }
  if (missing.length > 15) {
    console.log(`  … 另有 ${missing.length - 15} 条`);
  }
  const fullTotal = missing.reduce((sum, r) => sum + r.amount, 0);
  console.log(`待补写合计: $${fullTotal.toFixed(2)} NZD\n`);

  if (!WRITE) {
    console.log("Dry-Run 完成。确认无误后执行: npx tsx scripts/align-sine-finance.ts --write\n");
    return;
  }

  const createdBy = await resolveCreatedBy(supabase);
  let inserted = 0;

  for (const row of missing) {
    const student = Array.isArray(row.booking.student)
      ? row.booking.student[0]
      : row.booking.student;
    const duration = Number(row.booking.duration) || 0;
    const identifier = student?.student_code || student?.name || "学员";

    const base = {
      type: "income" as const,
      amount: row.amount,
      category: "Tuition",
      description: `消课实收 ${row.marker} ${identifier} × ${duration}h`,
      transaction_date: row.booking.start_time ?? new Date().toISOString(),
      business_unit_id: BUSINESS_ID,
      created_by: createdBy,
      student_id: row.booking.student_id,
      quantity: duration,
    };

    let { error } = await supabase.from("transactions").insert({
      ...base,
      currency: "NZD",
    });
    if (error && /currency/i.test(error.message)) {
      ({ error } = await supabase.from("transactions").insert(base));
    }
    if (error) {
      console.error(`  ✗ booking ${row.booking.id}: ${error.message}`);
      continue;
    }
    inserted++;
  }

  console.log(`✓ 已补写 ${inserted} 条 Tuition 流水（created_by: ${createdBy.slice(0, 8)}…）\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
