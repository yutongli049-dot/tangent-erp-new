export const REPEAT_MODE_OPTIONS = [
  { value: "none", label: "单次 (No repeat)" },
  { value: "weekly_once", label: "每周单次重复" },
  { value: "weekly_multi", label: "每周多次重复" },
  { value: "biweekly", label: "每两周重复" },
  { value: "monthly", label: "每月重复" },
  { value: "custom", label: "自定义重复" },
] as const;

export type RepeatMode = (typeof REPEAT_MODE_OPTIONS)[number]["value"];

/** 兼容旧表单值 weekly → weekly_multi */
export function normalizeRepeatMode(mode: string): string {
  if (mode === "weekly") return "weekly_multi";
  return mode;
}

export function isRecurringMode(mode: string): boolean {
  return normalizeRepeatMode(mode) !== "none";
}

/** 使用「每周时间表」构建器的模式 */
export function usesWeeklyScheduleBuilder(mode: string): boolean {
  const m = normalizeRepeatMode(mode);
  return m === "weekly_multi" || m === "custom";
}

/** 使用单一时间选择器的循环模式（含单次） */
export function usesSingleTimePicker(mode: string): boolean {
  const m = normalizeRepeatMode(mode);
  return (
    m === "none" ||
    m === "weekly_once" ||
    m === "biweekly" ||
    m === "monthly"
  );
}

export function getWeekStep(mode: string, customIntervalWeeks: number): number {
  const m = normalizeRepeatMode(mode);
  if (m === "biweekly") return 2;
  if (m === "custom") return Math.max(1, customIntervalWeeks);
  return 1;
}

export function shouldParseWeeklySchedule(mode: string): boolean {
  return usesWeeklyScheduleBuilder(mode);
}
