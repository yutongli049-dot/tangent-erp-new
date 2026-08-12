/**
 * 驾校自然语言排课 / ICS 标题解析（sine 共用）
 * 例：3045 限制性练车 panmure 教练车 牛 85🔪
 */

export const DRIVING_SUBJECTS = [
  "道路熟悉练车",
  "限制性练车",
  "全驾照练车",
  "限制性陪考",
  "全驾照陪考",
] as const;

export type DrivingSubject = (typeof DRIVING_SUBJECTS)[number];

export const DRIVING_COACHES = ["牛教练", "童教练"] as const;
export type DrivingCoach = (typeof DRIVING_COACHES)[number];

/** 表单下拉仍兼容的旧 label */
export const LEGACY_SUBJECT_MAP: Record<string, DrivingSubject> = {
  "道路熟悉 (Familiarization)": "道路熟悉练车",
  "限制性 (Restricted)": "限制性练车",
  "全驾照 (Full)": "全驾照练车",
  "练车": "限制性练车",
  "陪练": "道路熟悉练车",
  "陪考": "限制性陪考",
  "考试": "全驾照陪考",
};

const COACH_RAW_TO_LABEL: Record<string, DrivingCoach> = {
  牛: "牛教练",
  大头: "童教练",
  老公: "童教练",
  童: "童教练",
};

const LOCATION_HINTS: Record<string, string> = {
  panmure: "VTNZ Mt Wellington (5 Sylvia Park Rd)",
  mtw: "VTNZ Mt Wellington (5 Sylvia Park Rd)",
  mtwell: "VTNZ Mt Wellington (5 Sylvia Park Rd)",
  "mt wellington": "VTNZ Mt Wellington (5 Sylvia Park Rd)",
  northshore: "VTNZ North Shore (120 Sunnybrae Rd)",
  北岸: "VTNZ North Shore (120 Sunnybrae Rd)",
  albany: "VTNZ Albany (5 Saturn Pl)",
  westgate: "VTNZ Westgate (6 Pinot Ln)",
  newlynn: "VTNZ New Lynn (46 Portage Rd)",
  "new lynn": "VTNZ New Lynn (46 Portage Rd)",
  gleninnes: "VTNZ Glen Innes (139 Apirana Ave)",
  glenfield: "VTNZ North Shore (120 Sunnybrae Rd)",
  silverdale: "VTNZ Silverdale (5 Furnace Pl)",
  warkworth: "VTNZ Warkworth (6/14 Glenmore Dr)",
  manukau: "VTNZ Manukau (132 Cavendish Rd)",
  pukekohe: "VTNZ Pukekohe (14 Subway Rd)",
  takanini: "VTNZ Takanini (14 Spartan Rd)",
  wiri: "VTNZ Wiri (103 Roscommon Rd)",
  ct: "Auckland CBD",
  city: "Auckland CBD",
  市区: "Auckland CBD",
  中区: "Auckland CBD",
};

export type ParsedDrivingText = {
  studentIdentifier: string | null;
  subject: DrivingSubject;
  coach: DrivingCoach | null;
  coachRaw: string | null;
  useInstructorCar: boolean | null;
  needPickup: boolean;
  plateNumber: string | null;
  transmission: "manual" | null;
  /** 显式 🔪 为整节课金额；无 🔪 时可为 null */
  sessionAmount: number | null;
  /** 建议时薪（结合 sessionAmount / durationHours 或 教练车 85 / 自己车 75） */
  suggestedHourlyRate: number | null;
  locationHint: string | null;
  resolvedLocation: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 从单行文本提取学员标识 */
export function extractStudentIdentifier(text: string): string | null {
  const trimmed = text.trim();
  const head = trimmed.match(/^([A-Za-z]*\d{2,}|\d{2,}[A-Za-z]*)\b/);
  if (head) return head[1]!;
  const mid = trimmed.match(/(?:^|\s)(\d{3,4})(?:\s|$)/);
  if (mid) return mid[1]!;
  const nameHead = trimmed.match(/^([A-Za-z]{2,})\b/);
  if (nameHead && /练车|陪练|陪考|考试/.test(trimmed)) return nameHead[1]!.toLowerCase();
  return null;
}

/** 显式 🔪 金额（整节课） */
export function extractSessionAmount(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*🔪/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** 解析教练简称 → 规范名 */
export function normalizeCoach(raw: string | null | undefined): DrivingCoach | null {
  if (!raw) return null;
  if ((DRIVING_COACHES as readonly string[]).includes(raw)) return raw as DrivingCoach;
  return COACH_RAW_TO_LABEL[raw] ?? null;
}

export function extractCoachRaw(text: string): string | null {
  const tags = ["牛", "大头", "老公", "童"] as const;
  return tags.find((t) => text.includes(t)) ?? null;
}

/** 规范科目枚举 */
export function normalizeDrivingSubject(raw: string | null | undefined): DrivingSubject {
  if (!raw?.trim()) return "限制性练车";

  const s = raw.trim();
  if ((DRIVING_SUBJECTS as readonly string[]).includes(s)) return s as DrivingSubject;
  if (LEGACY_SUBJECT_MAP[s]) return LEGACY_SUBJECT_MAP[s];

  const isTest = /陪考|考试/.test(s);
  const isRestricted = /限制性|restricted/i.test(s);
  const isFull = /全驾照|full/i.test(s);
  const isFamiliar = /道路熟悉|熟悉|familiar/i.test(s);

  if (isTest) {
    if (isRestricted) return "限制性陪考";
    if (isFull) return "全驾照陪考";
    return s.includes("陪考") ? "限制性陪考" : "全驾照陪考";
  }

  if (isFamiliar || s.includes("陪练")) return "道路熟悉练车";
  if (isFull) return "全驾照练车";
  if (isRestricted) return "限制性练车";
  if (/练车/.test(s)) return "限制性练车";

  return "限制性练车";
}

/** 从自由文本推断科目 */
export function detectSubjectFromText(text: string): DrivingSubject {
  if (/陪考/.test(text)) {
    return /限制性|restricted/i.test(text) ? "限制性陪考" : "限制性陪考";
  }
  if (/考试/.test(text)) {
    return /限制性|restricted/i.test(text) ? "限制性陪考" : "全驾照陪考";
  }
  if (/道路熟悉|熟悉|familiar/i.test(text) || /陪练/.test(text)) return "道路熟悉练车";
  if (/全驾照|full/i.test(text)) return "全驾照练车";
  if (/限制性|restricted/i.test(text)) return "限制性练车";
  if (/练车/.test(text)) return "限制性练车";
  return "限制性练车";
}

export function resolveLocationFromHint(hint: string | null): string | null {
  if (!hint) return null;
  const key = hint.trim().toLowerCase();
  if (LOCATION_HINTS[key]) return LOCATION_HINTS[key];
  for (const [k, v] of Object.entries(LOCATION_HINTS)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return hint;
}

export function extractLocationHint(text: string): string | null {
  const lower = text.toLowerCase();
  for (const key of Object.keys(LOCATION_HINTS)) {
    if (lower.includes(key.toLowerCase())) return key;
  }
  return null;
}

export function extractCarFlags(text: string): {
  useInstructorCar: boolean | null;
  needPickup: boolean;
  plateNumber: string | null;
  transmission: "manual" | null;
} {
  let useInstructorCar: boolean | null = null;
  if (text.includes("教练车")) useInstructorCar = true;
  else if (text.includes("自己车")) useInstructorCar = false;

  const studentCode = extractStudentIdentifier(text);
  const plateMatch = text.match(/\b([A-Za-z]{2,3}\d{2,4})\b/g);
  const plateNumber =
    plateMatch?.find((p) => p.toLowerCase() !== studentCode?.toLowerCase())?.toUpperCase() ??
    null;

  return {
    useInstructorCar,
    needPickup: text.includes("接送"),
    plateNumber,
    transmission: text.includes("手动挡") ? "manual" : null,
  };
}

/**
 * 解析驾校极速单行文本
 * @param durationHours 当前表单课时，用于 🔪 → 时薪换算
 */
export function parseDrivingBookingText(
  text: string,
  durationHours = 1
): ParsedDrivingText | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const studentIdentifier = extractStudentIdentifier(trimmed);
  const subject = detectSubjectFromText(trimmed);
  const coachRaw = extractCoachRaw(trimmed);
  const coach = normalizeCoach(coachRaw);
  const { useInstructorCar, needPickup, plateNumber, transmission } =
    extractCarFlags(trimmed);
  const sessionAmount = extractSessionAmount(trimmed);
  const locationHint = extractLocationHint(trimmed);
  const resolvedLocation = resolveLocationFromHint(locationHint);

  let suggestedHourlyRate: number | null = null;
  if (sessionAmount != null && durationHours > 0) {
    suggestedHourlyRate = round2(sessionAmount / durationHours);
  } else if (useInstructorCar === true) {
    suggestedHourlyRate = 85;
  } else if (useInstructorCar === false) {
    suggestedHourlyRate = 75;
  }

  return {
    studentIdentifier,
    subject,
    coach,
    coachRaw,
    useInstructorCar,
    needPickup,
    plateNumber,
    transmission,
    sessionAmount,
    suggestedHourlyRate,
    locationHint,
    resolvedLocation,
  };
}

/** ICS SUMMARY：[牛教练] 限制性练车 - 3045 (教练车 $85) */
export function formatSineIcsSummary(input: {
  subject?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  metadata?: Record<string, unknown> | null;
  actualRate?: number | null;
  duration?: number | null;
}): string {
  const subject = normalizeDrivingSubject(input.subject ?? "");
  const coach =
    normalizeCoach(String(input.metadata?.coach ?? "")) ??
    (input.metadata?.coach ? String(input.metadata.coach) : null);
  const coachLabel = coach ?? "未指定教练";
  const identifier =
    input.studentCode?.trim() ||
    input.studentName?.trim() ||
    "未知学员";

  const useCar = input.metadata?.useInstructorCar;
  let carLabel = "未指定车辆";
  if (useCar === true) carLabel = "教练车";
  else if (useCar === false) carLabel = "自己车";

  const rate = Number(input.actualRate) || 0;
  const amount =
    rate > 0 && input.duration
      ? round2(rate * Number(input.duration))
      : rate > 0
        ? rate
        : null;
  const pricePart = amount != null ? `$${amount}` : rate > 0 ? `$${rate}/hr` : "";

  return `[${coachLabel}] ${subject} - ${identifier} (${carLabel}${pricePart ? ` ${pricePart}` : ""})`.trim();
}

/** ICS DESCRIPTION 明细 */
export function formatSineIcsDescription(input: {
  subject?: string | null;
  studentCode?: string | null;
  studentName?: string | null;
  location?: string | null;
  notes?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  actualRate?: number | null;
  duration?: number | null;
  startTimeLabel?: string;
}): string {
  const subject = normalizeDrivingSubject(input.subject ?? "");
  const coachRaw = input.metadata?.coach ? String(input.metadata.coach) : null;
  const coach = normalizeCoach(coachRaw) ?? coachRaw ?? "未指定";
  const identifier = input.studentCode || "—";
  const name = input.studentName || "—";
  const useCar = input.metadata?.useInstructorCar;
  const carLabel =
    useCar === true ? "教练车" : useCar === false ? "自己车" : "未指定";
  const rate = Number(input.actualRate) || 0;
  const duration = Number(input.duration) || 0;
  const sessionTotal = rate > 0 && duration > 0 ? round2(rate * duration) : null;
  const statusLabel = input.status === "completed" ? "已完成" : "待进行";

  const lines = [
    "Tangent ERP · Sine Driving",
    "────────────────",
    `教练：${coach}`,
    `科目：${subject}`,
    `学员：${name} (${identifier})`,
    `用车：${carLabel}`,
    rate > 0 ? `时薪：$${rate}/hr` : null,
    sessionTotal != null ? `本节课金额：$${sessionTotal}` : null,
    input.metadata?.needPickup ? "接送：是" : null,
    input.metadata?.pickupAddress
      ? `接送地址：${input.metadata.pickupAddress}`
      : null,
    input.metadata?.plateNumber ? `车牌：${input.metadata.plateNumber}` : null,
    input.metadata?.transmission === "manual" ? "车型：手动挡" : null,
    `地点：${input.location?.trim() || "未指定"}`,
    input.startTimeLabel ? `时间：${input.startTimeLabel}` : null,
    `状态：${statusLabel}`,
    input.notes?.trim() ? `备注：${input.notes.trim()}` : null,
  ].filter(Boolean);

  return lines.join("\n");
}
