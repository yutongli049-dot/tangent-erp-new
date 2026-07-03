import { addDays, addMonths, isSameDay, type Locale } from "date-fns";
import { fromZonedTime, formatInTimeZone, toZonedTime } from "date-fns-tz";

export const TZ_NZ = "Pacific/Auckland";
export const TZ_CN = "Asia/Shanghai";

/** 新西兰「今天」的日历日期 YYYY-MM-DD */
export function getTodayInNZ(): string {
  return formatInTimeZone(new Date(), TZ_NZ, "yyyy-MM-dd");
}

/** 将新西兰本地 date + time 解析为 UTC Date（存储屏障） */
export function nzLocalToUtc(dateStr: string, timeStr: string): Date {
  const normalized = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return fromZonedTime(`${dateStr} ${normalized}`, TZ_NZ);
}

/** UTC ISO → 新西兰日期/时间（编辑表单回填） */
export function utcToNzDateStr(utcIso: string): string {
  return formatInTimeZone(new Date(utcIso), TZ_NZ, "yyyy-MM-dd");
}

export function utcToNzTimeStr(utcIso: string): string {
  return formatInTimeZone(new Date(utcIso), TZ_NZ, "HH:mm");
}

/** 新西兰日历日加减（避免服务器本地时区污染） */
export function addCalendarDaysInNZ(dateStr: string, days: number): string {
  const anchor = fromZonedTime(`${dateStr} 12:00:00`, TZ_NZ);
  const zoned = toZonedTime(anchor, TZ_NZ);
  return formatInTimeZone(addDays(zoned, days), TZ_NZ, "yyyy-MM-dd");
}

/** 新西兰日历月加减（每月重复排课） */
export function addCalendarMonthsInNZ(dateStr: string, months: number): string {
  const anchor = fromZonedTime(`${dateStr} 12:00:00`, TZ_NZ);
  const zoned = toZonedTime(anchor, TZ_NZ);
  return formatInTimeZone(addMonths(zoned, months), TZ_NZ, "yyyy-MM-dd");
}

/** 新西兰星期几 0=周日 … 6=周六 */
export function getDayOfWeekInNZ(dateStr: string): number {
  const anchor = fromZonedTime(`${dateStr} 12:00:00`, TZ_NZ);
  return toZonedTime(anchor, TZ_NZ).getDay();
}

/** 新西兰当日结束时刻的 UTC Date（用于循环排课截止比较） */
export function nzEndOfDayUtc(dateStr: string): Date {
  return fromZonedTime(`${dateStr} 23:59:59`, TZ_NZ);
}

/** 双时区时间展示：16:00 (NZT) / 12:00 (BJT) */
export function formatDualTime(utcIso: string): string {
  const d = new Date(utcIso);
  const nzt = formatInTimeZone(d, TZ_NZ, "HH:mm");
  const bjt = formatInTimeZone(d, TZ_CN, "HH:mm");
  return `${nzt} (NZT) / ${bjt} (BJT)`;
}

export function formatDualTimeParts(utcIso: string): { nzt: string; bjt: string } {
  const d = new Date(utcIso);
  return {
    nzt: formatInTimeZone(d, TZ_NZ, "HH:mm"),
    bjt: formatInTimeZone(d, TZ_CN, "HH:mm"),
  };
}

/** 根据新西兰本地输入预览双时区（新建排课） */
export function formatDualTimeFromNzLocal(dateStr: string, timeStr: string): string {
  if (!dateStr || !timeStr) return "";
  return formatDualTime(nzLocalToUtc(dateStr, timeStr).toISOString());
}

export function utcToNzDateKey(utcIso: string): string {
  return formatInTimeZone(new Date(utcIso), TZ_NZ, "yyyy-MM-dd");
}

export function isTodayInNZ(utcIso: string): boolean {
  const now = toZonedTime(new Date(), TZ_NZ);
  const target = toZonedTime(new Date(utcIso), TZ_NZ);
  return isSameDay(now, target);
}

export function isTomorrowInNZ(utcIso: string): boolean {
  const now = toZonedTime(new Date(), TZ_NZ);
  const tomorrow = addDays(now, 1);
  const target = toZonedTime(new Date(utcIso), TZ_NZ);
  return isSameDay(tomorrow, target);
}

export function formatDateLabelInNZ(utcIso: string, locale?: Locale): string {
  return formatInTimeZone(new Date(utcIso), TZ_NZ, "M月d日 EEEE", { locale });
}
