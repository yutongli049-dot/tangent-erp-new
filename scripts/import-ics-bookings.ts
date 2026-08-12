/**
 * 驾校历史日历 (.ics) → Supabase (sine) 批量导入
 *
 * 用法:
 *   npx tsx scripts/import-ics-bookings.ts              # Dry-Run（默认，不写库）
 *   npx tsx scripts/import-ics-bookings.ts --dry-run
 *   npx tsx scripts/import-ics-bookings.ts --csv         # 导出复核 CSV（不写库）
 *   npx tsx scripts/import-ics-bookings.ts --export      # 同 --csv
 *   npx tsx scripts/import-ics-bookings.ts --write       # 真正写入（需确认预览后）
 *
 * 环境变量（--write 时需要，自动从 .env.local 加载）:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 计费规则:
 *   1. 标题含 N🔪 → 实收 N，actual_rate = N / duration
 *   2. 无 🔪 → 标准价 75 NZD/h × duration，actual_rate = 75
 *
 * 日期窗口（按课程开始日 NZT）:
 *   < 2026-05-01          → SKIP（CEO 已手工录入）
 *   2026-05-01 .. 2026-08-11 → completed + 收入流水
 *   > 2026-08-11          → confirmed 未来排课，不写流水
 */

import { config as loadEnv } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 优先读取 Next.js 本地环境文件（根目录 .env.local）
loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv({ path: resolve(process.cwd(), ".env") }); // 兜底

const BUSINESS_ID = "sine";
const TZ_NZ = "Pacific/Auckland";
const ICS_PATH = resolve(process.cwd(), "sources/driving_calendar.ics");
const CSV_PREVIEW_PATH = resolve(
  process.cwd(),
  "sources/imported_bookings_preview.csv"
);
/** 无 🔪 显式金额时的标准课时费（NZD/小时） */
const DEFAULT_HOURLY_RATE = 75;
/** NZT 日历日：此日之前跳过（含更早全部） */
const IMPORT_FROM_NZ = "2026-05-01";
/** NZT 日历日：含当日及更早（且 ≥ IMPORT_FROM）→ 已消课 + 流水 */
const COMPLETED_UNTIL_NZ = "2026-08-11";

const COACH_TAGS = ["牛", "大头", "老公"] as const;
const LESSON_KEYWORDS = ["练车", "陪练"] as const;
const TEST_KEYWORDS = ["陪考", "考试"] as const;

type PriceSource = "explicit" | "default";
/** historical = 已消课写流水；future = 未来排课不写流水 */
type DateBucket = "historical" | "future";
type BookingStatus = "completed" | "confirmed";

type CourseType = "lesson" | "test";

export type ParsedIcsBooking = {
  uid: string;
  summary: string;
  studentCode: string;
  courseType: CourseType;
  subject: string;
  location: string;
  startTimeUtc: string;
  endTimeUtc: string;
  startNz: string;
  /** YYYY-MM-DD（NZT 开课日） */
  startDateNz: string;
  endNz: string;
  durationHours: number;
  /** 实收金额：显式 🔪 或 75×duration 兜底（未来课也算出，但不写流水） */
  incomeAmount: number;
  /** 时薪：显式时 = amount/duration；兜底时固定 75 */
  actualRate: number;
  priceSource: PriceSource;
  dateBucket: DateBucket;
  metadata: {
    icsUid: string;
    coach: string | null;
    transmission: "manual" | null;
    useInstructorCar: boolean | null;
    needPickup: boolean;
    plateNumber: string | null;
    rawTags: string[];
    priceSource: PriceSource;
    dateBucket: DateBucket;
  };
  notes: string;
  /** 仅 historical 有流水；future 为 null */
  transaction: null | {
    type: "income";
    amount: number;
    category: "Tuition";
    description: string;
    transaction_date: string;
    business_unit_id: typeof BUSINESS_ID;
    currency: "NZD";
    student_code: string;
  };
  booking: {
    business_unit_id: typeof BUSINESS_ID;
    status: BookingStatus;
    location: string;
    subject: string;
    start_time: string;
    end_time: string;
    duration: number;
    actual_rate: number;
    notes: string;
    metadata: ParsedIcsBooking["metadata"];
  };
};

type SkipReason =
  | "no_course_keyword"
  | "no_student_code"
  | "bad_datetime"
  | "zero_duration"
  | "before_import_window";

/** 按 NZT 开课日划分导入桶；早于窗口返回 null（应 SKIP） */
function classifyDateBucket(startDateNz: string): DateBucket | null {
  if (startDateNz < IMPORT_FROM_NZ) return null;
  if (startDateNz <= COMPLETED_UNTIL_NZ) return "historical";
  return "future";
}
// ─── ICS 解析 ───────────────────────────────────────────────

function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function parseIcsProperties(block: string): Record<string, string> {
  const props: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith("BEGIN:") || line.startsWith("END:")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const keyPart = line.slice(0, colon);
    const value = line.slice(colon + 1);
    const key = keyPart.split(";")[0]!.toUpperCase();
    // DTSTART/DTEND 需要保留 TZID 参数
    if (key === "DTSTART" || key === "DTEND") {
      props[key] = line; // 整行，便于解析 TZID + 本地时间
    } else {
      props[key] = value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\\\/g, "\\");
    }
  }
  return props;
}

/** 解析 DTSTART/DTEND 行 → UTC Date（ICS 里已是 Pacific/Auckland 墙钟） */
function parseIcsDateTime(line: string | undefined): Date | null {
  if (!line) return null;
  // DTSTART;TZID=Pacific/Auckland:20260403T150000
  // DTSTART:20260403T150000Z
  const m = line.match(/(?:TZID=([^:;]+):)?(\d{8}T\d{6})(Z)?$/i);
  if (!m) return null;
  const [, tzid, stamp, zulu] = m;
  const y = stamp!.slice(0, 4);
  const mo = stamp!.slice(4, 6);
  const d = stamp!.slice(6, 8);
  const hh = stamp!.slice(9, 11);
  const mm = stamp!.slice(11, 13);
  const ss = stamp!.slice(13, 15);
  const local = `${y}-${mo}-${d} ${hh}:${mm}:${ss}`;
  if (zulu) return new Date(`${y}-${mo}-${d}T${hh}:${mm}:${ss}Z`);
  const zone = tzid || TZ_NZ;
  return fromZonedTime(local, zone);
}

function extractVevents(icsText: string): Record<string, string>[] {
  const unfolded = unfoldIcs(icsText);
  const blocks = unfolded.split("BEGIN:VEVENT").slice(1);
  return blocks.map((chunk) => {
    const end = chunk.indexOf("END:VEVENT");
    const body = end >= 0 ? chunk.slice(0, end) : chunk;
    return parseIcsProperties(body);
  });
}

// ─── SUMMARY 业务解析 ───────────────────────────────────────

function detectCourseType(summary: string): { courseType: CourseType; subject: string } | null {
  const hasTest = TEST_KEYWORDS.some((k) => summary.includes(k));
  const hasLesson = LESSON_KEYWORDS.some((k) => summary.includes(k));
  if (!hasTest && !hasLesson) return null;
  if (hasTest) {
    const subject = summary.includes("陪考") ? "陪考" : "考试";
    return { courseType: "test", subject };
  }
  const subject = summary.includes("陪练") ? "陪练" : "练车";
  return { courseType: "lesson", subject };
}

/** 标题中显式 🔪 金额；无则 null（由调用方按标准价兜底） */
function extractExplicitIncome(summary: string): number | null {
  const m = summary.match(/(\d+(?:\.\d+)?)\s*🔪/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * 计费：显式 🔪 优先；否则 75 NZD/h × duration
 * - explicit → actual_rate = amount / duration
 * - default  → actual_rate = 75，amount = 75 × duration
 */
function resolvePricing(summary: string, durationHours: number): {
  incomeAmount: number;
  actualRate: number;
  priceSource: PriceSource;
} {
  const explicit = extractExplicitIncome(summary);
  if (explicit != null) {
    return {
      incomeAmount: explicit,
      actualRate: durationHours > 0 ? round2(explicit / durationHours) : DEFAULT_HOURLY_RATE,
      priceSource: "explicit",
    };
  }
  return {
    incomeAmount: round2(DEFAULT_HOURLY_RATE * durationHours),
    actualRate: DEFAULT_HOURLY_RATE,
    priceSource: "default",
  };
}

function extractStudentCode(summary: string): string | null {
  const trimmed = summary.trim();
  // 常见：开头学号/代号 3045 / sms8869
  const head = trimmed.match(/^([A-Za-z]*\d{2,}|\d{2,}[A-Za-z]*)\b/);
  if (head) return head[1]!;
  // 如「限制性考试 560 学员…」
  const mid = trimmed.match(/(?:^|\s)(\d{3,4})(?:\s|$)/);
  if (mid) return mid[1]!;
  // 纯字母代号（少见，如 mars）且后续有课程词时
  const nameHead = trimmed.match(/^([A-Za-z]{2,})\b/);
  if (nameHead && detectCourseType(trimmed)) return nameHead[1]!.toLowerCase();
  return null;
}

function extractMetadata(summary: string, uid: string) {
  const coach = COACH_TAGS.find((t) => summary.includes(t)) ?? null;
  const transmission = summary.includes("手动挡") ? ("manual" as const) : null;
  let useInstructorCar: boolean | null = null;
  if (summary.includes("教练车")) useInstructorCar = true;
  else if (summary.includes("自己车")) useInstructorCar = false;
  const needPickup = summary.includes("接送");

  // NZ 车牌：字母2–3 + 数字2–4，且不是学员代号本身
  const studentCode = extractStudentCode(summary);
  const plateMatch = summary.match(/\b([A-Za-z]{2,3}\d{2,4})\b/g);
  const plateNumber =
    plateMatch?.find((p) => p.toLowerCase() !== studentCode?.toLowerCase())?.toUpperCase() ??
    null;

  const rawTags = [
    ...COACH_TAGS.filter((t) => summary.includes(t)),
    ...(summary.includes("手动挡") ? ["手动挡"] : []),
    ...(summary.includes("教练车") ? ["教练车"] : []),
    ...(summary.includes("自己车") ? ["自己车"] : []),
    ...(needPickup ? ["接送"] : []),
  ];

  return {
    icsUid: uid,
    coach,
    transmission,
    useInstructorCar,
    needPickup,
    plateNumber,
    rawTags,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function parseEvent(
  props: Record<string, string>
): { ok: true; data: ParsedIcsBooking } | { ok: false; reason: SkipReason; summary: string; uid: string } {
  const summary = (props.SUMMARY || "").trim();
  const uid = (props.UID || "").trim() || `no-uid-${summary.slice(0, 20)}`;
  const course = detectCourseType(summary);
  if (!course) return { ok: false, reason: "no_course_keyword", summary, uid };

  const studentCode = extractStudentCode(summary);
  if (!studentCode) return { ok: false, reason: "no_student_code", summary, uid };

  const start = parseIcsDateTime(props.DTSTART);
  const end = parseIcsDateTime(props.DTEND);
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { ok: false, reason: "bad_datetime", summary, uid };
  }

  const durationMs = end.getTime() - start.getTime();
  const durationHours = round2(durationMs / 3_600_000);
  if (durationHours <= 0) return { ok: false, reason: "zero_duration", summary, uid };

  const startDateNz = formatInTimeZone(start, TZ_NZ, "yyyy-MM-dd");
  const dateBucket = classifyDateBucket(startDateNz);
  if (!dateBucket) {
    return { ok: false, reason: "before_import_window", summary, uid };
  }

  const { incomeAmount, actualRate, priceSource } = resolvePricing(summary, durationHours);

  const location = (props.LOCATION || "").replace(/\n+/g, ", ").trim();
  const metadata = { ...extractMetadata(summary, uid), priceSource, dateBucket };
  const startTimeUtc = start.toISOString();
  const endTimeUtc = end.toISOString();
  const startNz = formatInTimeZone(start, TZ_NZ, "yyyy-MM-dd HH:mm");
  const endNz = formatInTimeZone(end, TZ_NZ, "yyyy-MM-dd HH:mm");
  const txDate = startDateNz;
  const priceNote = priceSource === "explicit" ? "显式🔪" : `标准价$${DEFAULT_HOURLY_RATE}/h`;
  const status: BookingStatus = dateBucket === "historical" ? "completed" : "confirmed";

  const data: ParsedIcsBooking = {
    uid,
    summary,
    studentCode,
    courseType: course.courseType,
    subject: course.subject,
    location,
    startTimeUtc,
    endTimeUtc,
    startNz,
    startDateNz,
    endNz,
    durationHours,
    incomeAmount,
    actualRate,
    priceSource,
    dateBucket,
    metadata,
    notes: `[ICS] ${summary}`,
    transaction:
      dateBucket === "historical"
        ? {
            type: "income",
            amount: incomeAmount,
            category: "Tuition",
            description: `ICS导入 [${uid}] · ${course.subject} · ${studentCode} · ${priceNote} · ${summary}`,
            transaction_date: txDate,
            business_unit_id: BUSINESS_ID,
            currency: "NZD",
            student_code: studentCode,
          }
        : null,
    booking: {
      business_unit_id: BUSINESS_ID,
      status,
      location,
      subject: course.subject,
      start_time: startTimeUtc,
      end_time: endTimeUtc,
      duration: durationHours,
      actual_rate: actualRate,
      notes: `[ICS] ${summary}`,
      metadata,
    },
  };

  return { ok: true, data };
}

export function parseIcsFile(filePath: string) {
  const raw = readFileSync(filePath, "utf8");
  const events = extractVevents(raw);
  const parsed: ParsedIcsBooking[] = [];
  const skipped: { reason: SkipReason; summary: string; uid: string }[] = [];

  for (const props of events) {
    const result = parseEvent(props);
    if (result.ok) parsed.push(result.data);
    else skipped.push({ reason: result.reason, summary: result.summary, uid: result.uid });
  }

  const historical = parsed.filter((p) => p.dateBucket === "historical");
  const future = parsed.filter((p) => p.dateBucket === "future");
  const historicalIncome = round2(historical.reduce((sum, p) => sum + p.incomeAmount, 0));
  const futureQuoted = round2(future.reduce((sum, p) => sum + p.incomeAmount, 0));
  const explicitPriced = parsed.filter((p) => p.priceSource === "explicit");
  const defaultPriced = parsed.filter((p) => p.priceSource === "default");
  const skipCounts = skipped.reduce(
    (acc, s) => {
      acc[s.reason] = (acc[s.reason] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return {
    totalVevents: events.length,
    parsed,
    skipped,
    stats: {
      totalVevents: events.length,
      importWindow: {
        from: IMPORT_FROM_NZ,
        completedUntil: COMPLETED_UNTIL_NZ,
        note: `<${IMPORT_FROM_NZ} skip | ${IMPORT_FROM_NZ}..${COMPLETED_UNTIL_NZ} completed+tx | >${COMPLETED_UNTIL_NZ} confirmed no-tx`,
      },
      skippedTotal: skipped.length,
      skipCounts,
      /** 早于 2026-05-01（CEO 已手工录入） */
      skippedBeforeWindow: skipCounts.before_import_window || 0,
      skippedOther:
        skipped.length - (skipCounts.before_import_window || 0),
      /** 可导入合计 */
      importableBookings: parsed.length,
      /** 已消课段 */
      historicalCompleted: {
        count: historical.length,
        incomeNzd: historicalIncome,
        transactionsToCreate: historical.length,
        status: "completed",
      },
      /** 未来排课段 */
      futureConfirmed: {
        count: future.length,
        quotedAmountNzd: futureQuoted,
        transactionsToCreate: 0,
        status: "confirmed",
      },
      pricedExplicit: explicitPriced.length,
      pricedDefault75: defaultPriced.length,
      defaultHourlyRate: DEFAULT_HOURLY_RATE,
      uniqueStudents: new Set(parsed.map((p) => p.studentCode)).size,
      lessons: parsed.filter((p) => p.courseType === "lesson").length,
      tests: parsed.filter((p) => p.courseType === "test").length,
    },
  };
}

// ─── Write 模式 ─────────────────────────────────────────────

async function ensureStudent(
  supabase: SupabaseClient,
  code: string,
  hourlyRate: number
): Promise<{ id: string; created: boolean }> {
  const { data: byCode } = await supabase
    .from("students")
    .select("id")
    .eq("business_unit_id", BUSINESS_ID)
    .eq("student_code", code)
    .limit(1)
    .maybeSingle();

  if (byCode?.id) return { id: byCode.id, created: false };

  const { data: byName } = await supabase
    .from("students")
    .select("id")
    .eq("business_unit_id", BUSINESS_ID)
    .eq("name", code)
    .limit(1)
    .maybeSingle();

  if (byName?.id) return { id: byName.id, created: false };

  const { data: created, error } = await supabase
    .from("students")
    .insert({
      name: code,
      student_code: code,
      business_unit_id: BUSINESS_ID,
      level: "Driving",
      balance: 0,
      payment_type: "single", // H1/H2：一课一缴，避免预付欠费误标
      hourly_rate: hourlyRate,
      // 部分库尚未迁移 students.currency；有列则写入，无列时由下方 fallback 重试
      currency: "NZD",
    })
    .select("id")
    .single();

  if (error) {
    // 无 currency 列时降级重试
    if (/currency/i.test(error.message)) {
      const retry = await supabase
        .from("students")
        .insert({
          name: code,
          student_code: code,
          business_unit_id: BUSINESS_ID,
          level: "Driving",
          balance: 0,
          payment_type: "single",
          hourly_rate: hourlyRate,
        })
        .select("id")
        .single();
      if (retry.error) throw new Error(`创建学员 ${code} 失败: ${retry.error.message}`);
      return { id: retry.data.id, created: true };
    }
    throw new Error(`创建学员 ${code} 失败: ${error.message}`);
  }
  return { id: created.id, created: true };
}

async function resolveCreatedBy(supabase: SupabaseClient): Promise<string> {
  const fromEnv =
    process.env.IMPORT_CREATED_BY ||
    process.env.SUPABASE_IMPORT_USER_ID ||
    "";
  if (fromEnv.trim()) return fromEnv.trim();

  // 复用库内已有流水的 created_by，避免 NOT NULL 约束失败
  const { data: txRow } = await supabase
    .from("transactions")
    .select("created_by")
    .not("created_by", "is", null)
    .limit(1)
    .maybeSingle();
  if (txRow?.created_by) return String(txRow.created_by);

  const { data: authData, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });
  const userId = authData?.users?.[0]?.id;
  if (userId) return userId;

  throw new Error(
    `transactions.created_by 为必填，且无法自动解析用户 ID。请在 .env.local 设置 IMPORT_CREATED_BY=<auth user uuid>${
      error ? `（admin.listUsers: ${error.message}）` : ""
    }`
  );
}

async function writeAll(parsed: ParsedIcsBooking[]) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "缺少 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY，无法写入"
    );
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const createdBy = await resolveCreatedBy(supabase);
  console.log(`  created_by: ${createdBy.slice(0, 8)}…（用于 transactions）`);

  let bookingsInserted = 0;
  let bookingsSkippedDup = 0;
  let txInserted = 0;
  let txSkippedDup = 0;
  let studentsCreated = 0;

  // 预查已导入 UID（幂等：metadata.icsUid）
  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("id, notes, metadata, student_id")
    .eq("business_unit_id", BUSINESS_ID)
    .like("notes", "[ICS]%");

  const existingByUid = new Map<
    string,
    { id: string; student_id: string | null }
  >();
  for (const b of existingBookings || []) {
    const uid = (b.metadata as { icsUid?: string } | null)?.icsUid;
    if (uid) existingByUid.set(uid, { id: b.id, student_id: b.student_id });
  }

  // 已存在的 ICS 流水（description 含 UID）
  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id, description")
    .eq("business_unit_id", BUSINESS_ID)
    .like("description", "ICS导入%");

  const existingTxUids = new Set<string>();
  for (const t of existingTx || []) {
    const m = String(t.description || "").match(/ICS导入 \[([^\]]+)\]/);
    if (m?.[1]) existingTxUids.add(m[1]);
  }

  const studentCache = new Map<string, string>();

  async function insertIncomeTx(
    studentId: string,
    row: ParsedIcsBooking
  ): Promise<boolean> {
    if (!row.transaction) return false;
    if (existingTxUids.has(row.uid)) {
      txSkippedDup++;
      return false;
    }

    const base = {
      type: row.transaction.type,
      amount: row.transaction.amount,
      category: row.transaction.category,
      description: row.transaction.description,
      transaction_date: row.transaction.transaction_date,
      business_unit_id: row.transaction.business_unit_id,
      student_id: studentId,
      created_by: createdBy,
      quantity: null as null, // single：不充课时、不扣余额
    };

    // 生产库可能尚未加 currency 列 → 先带 currency 试，失败再降级
    let { error: tErr } = await supabase.from("transactions").insert({
      ...base,
      currency: row.transaction.currency,
    });
    if (tErr && /currency/i.test(tErr.message)) {
      ({ error: tErr } = await supabase.from("transactions").insert(base));
    }
    if (tErr) {
      console.error(`❌ transaction 失败 [${row.uid}]:`, tErr.message);
      return false;
    }
    existingTxUids.add(row.uid);
    txInserted++;
    return true;
  }

  for (const row of parsed) {
    const existing = existingByUid.get(row.uid);

    let studentId = studentCache.get(row.studentCode);
    if (!studentId) {
      if (existing?.student_id) {
        studentId = existing.student_id;
        studentCache.set(row.studentCode, studentId);
      } else {
        const ensured = await ensureStudent(supabase, row.studentCode, row.actualRate);
        studentId = ensured.id;
        studentCache.set(row.studentCode, studentId);
        if (ensured.created) studentsCreated++;
      }
    }

    if (existing) {
      bookingsSkippedDup++;
      // 补写上次失败的流水（historical only）
      await insertIncomeTx(studentId, row);
      continue;
    }

    const { error: bErr } = await supabase.from("bookings").insert({
      student_id: studentId,
      business_unit_id: row.booking.business_unit_id,
      status: row.booking.status,
      location: row.booking.location || null,
      subject: row.booking.subject,
      start_time: row.booking.start_time,
      end_time: row.booking.end_time,
      duration: row.booking.duration,
      actual_rate: row.booking.actual_rate,
      notes: row.booking.notes,
      metadata: row.booking.metadata,
    });

    if (bErr) {
      console.error(`❌ booking 失败 [${row.uid}]:`, bErr.message);
      continue;
    }
    bookingsInserted++;
    existingByUid.set(row.uid, { id: "new", student_id: studentId });

    await insertIncomeTx(studentId, row);
  }

  return {
    bookingsInserted,
    bookingsSkippedDup,
    txInserted,
    txSkippedDup,
    studentsCreated,
  };
}

// ─── CSV 导出（人工复核）───────────────────────────────────

function csvEscape(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatCoachCarNotes(p: ParsedIcsBooking): string {
  const m = p.metadata;
  const parts: string[] = [];
  if (m.coach) parts.push(`教练:${m.coach}`);
  if (m.transmission === "manual") parts.push("手动挡");
  if (m.useInstructorCar === true) parts.push("教练车");
  if (m.useInstructorCar === false) parts.push("自己车");
  if (m.needPickup) parts.push("接送");
  if (m.plateNumber) parts.push(`车牌:${m.plateNumber}`);
  const extras = m.rawTags.filter(
    (t) => !parts.some((p) => p.includes(t) || p.endsWith(t))
  );
  if (extras.length) parts.push(...extras);
  return parts.join(" | ");
}

/** 导出可导入课程为本地 CSV，供人工复核 */
export function exportPreviewCsv(
  parsed: ParsedIcsBooking[],
  outPath: string = CSV_PREVIEW_PATH
): string {
  const headers = [
    "date",
    "duration_hours",
    "student_identifier",
    "course_type",
    "raw_summary",
    "location",
    "calculated_amount",
    "actual_rate",
    "price_source",
    "booking_status",
    "date_bucket",
    "will_create_transaction",
    "coach_car_notes",
  ] as const;

  // 按 NZT 开课时间排序，便于人工按时间线复核
  const rows = [...parsed].sort((a, b) =>
    a.startTimeUtc.localeCompare(b.startTimeUtc)
  );

  const lines = [
    headers.join(","),
    ...rows.map((p) =>
      [
        csvEscape(p.startNz),
        csvEscape(p.durationHours),
        csvEscape(p.studentCode),
        csvEscape(p.subject), // 练车 / 陪练 / 陪考 / 考试
        csvEscape(p.summary),
        csvEscape(p.location),
        csvEscape(p.incomeAmount),
        csvEscape(p.actualRate),
        csvEscape(p.priceSource), // explicit | default
        csvEscape(p.booking.status),
        csvEscape(p.dateBucket),
        csvEscape(p.transaction ? "yes" : "no"),
        csvEscape(formatCoachCarNotes(p)),
      ].join(",")
    ),
  ];

  // BOM 方便 Excel 正确识别 UTF-8 中文
  writeFileSync(outPath, "\uFEFF" + lines.join("\r\n"), "utf8");
  return outPath;
}

// ─── CLI ────────────────────────────────────────────────────

function previewRow(p: ParsedIcsBooking) {
  return {
    uid: p.uid,
    summary: p.summary,
    studentCode: p.studentCode,
    courseType: p.courseType,
    subject: p.subject,
    location: p.location,
    startNz: p.startNz,
    startDateNz: p.startDateNz,
    dateBucket: p.dateBucket,
    bookingStatus: p.booking.status,
    willCreateTransaction: !!p.transaction,
    durationHours: p.durationHours,
    incomeAmount: p.incomeAmount,
    actualRate: p.actualRate,
    priceSource: p.priceSource,
    metadata: p.metadata,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const writeMode = args.includes("--write");
  const csvMode = args.includes("--csv") || args.includes("--export");
  const dryRun = !writeMode && !csvMode;

  console.log("═══════════════════════════════════════════════");
  console.log(" Sine Driving · ICS → Supabase 导入");
  console.log(` 文件: ${ICS_PATH}`);
  console.log(
    ` 模式: ${
      writeMode
        ? "WRITE（写入 sine）"
        : csvMode
          ? "CSV EXPORT（导出复核表，不写库）"
          : "DRY-RUN（仅解析，不写库）"
    }`
  );
  console.log("═══════════════════════════════════════════════\n");

  const { parsed, skipped, stats } = parseIcsFile(ICS_PATH);

  console.log("── 日期窗口分段统计（NZT）────────────────────");
  console.log(`  窗口: < ${IMPORT_FROM_NZ} SKIP | ${IMPORT_FROM_NZ} ~ ${COMPLETED_UNTIL_NZ} completed+流水 | > ${COMPLETED_UNTIL_NZ} confirmed 无流水`);
  console.log(`  ① 早于 ${IMPORT_FROM_NZ} 跳过:        ${stats.skippedBeforeWindow} 条`);
  console.log(
    `  ② 已消课导入 (${IMPORT_FROM_NZ}~${COMPLETED_UNTIL_NZ}): ${stats.historicalCompleted.count} 条 · 收入 $${stats.historicalCompleted.incomeNzd.toFixed(2)} · 流水 ${stats.historicalCompleted.transactionsToCreate} 条`
  );
  console.log(
    `  ③ 未来排课 (>${COMPLETED_UNTIL_NZ}):         ${stats.futureConfirmed.count} 条 · 报价参考 $${stats.futureConfirmed.quotedAmountNzd.toFixed(2)} · 流水 0`
  );
  console.log(`  其他解析跳过（无课程词/无学号等）: ${stats.skippedOther} 条`);
  console.log(`  可导入合计: ${stats.importableBookings} 条\n`);

  console.log("── 完整统计 JSON ─────────────────────────────");
  console.log(JSON.stringify(stats, null, 2));

  if (csvMode) {
    const outPath = exportPreviewCsv(parsed);
    console.log("\n── CSV 导出完成（供人工复核）────────────────");
    console.log(`  行数: ${parsed.length}（含表头共 ${parsed.length + 1} 行）`);
    console.log(`  路径: ${outPath}`);
    console.log("\n请打开该文件核对金额 / 学员 / 课时后再执行写入：");
    console.log("   npx tsx scripts/import-ics-bookings.ts --write");
    console.log("\nWindows 快捷打开示例：");
    console.log(`   start "" "${outPath}"`);
    return;
  }

  console.log("\n── 前 10 条解析预览 ──────────────────────────");
  console.log(JSON.stringify(parsed.slice(0, 10).map(previewRow), null, 2));

  if (skipped.length > 0) {
    console.log("\n── 跳过样例（最多 8 条）─────────────────────");
    console.log(
      JSON.stringify(
        skipped.slice(0, 8).map((s) => ({ reason: s.reason, summary: s.summary })),
        null,
        2
      )
    );
  }

  if (dryRun) {
    console.log("\n✅ Dry-Run 完成。可导出 CSV 复核，或确认后写入：");
    console.log("   npx tsx scripts/import-ics-bookings.ts --csv");
    console.log("   npx tsx scripts/import-ics-bookings.ts --write");
    return;
  }

  console.log("\n⏳ 开始写入 Supabase (sine)…");
  const result = await writeAll(parsed);
  console.log("\n── 写入结果 ──────────────────────────────────");
  console.log(JSON.stringify(result, null, 2));
  console.log("\n✅ Write 完成");
}

const isDirectRun =
  typeof process.argv[1] === "string" &&
  /import-ics-bookings\.(ts|js|mts|cjs)$/.test(
    process.argv[1].replace(/\\/g, "/")
  );

if (isDirectRun) {
  main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}