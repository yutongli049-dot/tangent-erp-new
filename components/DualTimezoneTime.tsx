"use client";

import { cn } from "@/lib/utils";
import {
  formatDualTimeFromNzLocal,
  formatDualTimeParts,
  formatNzTimeRange,
} from "@/lib/timezone";

type UtcProps = {
  utcIso: string;
  endUtc?: string | null;
  durationHours?: number | null;
  className?: string;
  compact?: boolean;
};

type LocalPreviewProps = {
  date: string;
  time: string;
  className?: string;
};

/** 从数据库 UTC 时间渲染中新双时区；有 endUtc 时显示 10:30 - 11:30 (1h) */
export function DualTimezoneTime({ utcIso, endUtc, durationHours, className, compact }: UtcProps) {
  const { bjt } = formatDualTimeParts(utcIso);
  const rangeLabel =
    endUtc || durationHours != null
      ? formatNzTimeRange(utcIso, endUtc, durationHours)
      : null;
  const { nzt } = formatDualTimeParts(utcIso);
  const primary = rangeLabel || nzt;

  if (compact) {
    return (
      <span className={cn("inline-flex flex-col items-end font-mono text-sm leading-tight", className)}>
        <span className="font-bold text-slate-700 whitespace-nowrap">{primary}</span>
        <span className="text-[10px] text-slate-400">NZT · {bjt} BJT</span>
      </span>
    );
  }
  return (
    <div className={cn("text-sm leading-snug", className)}>
      <span className="font-bold font-mono text-slate-800">{primary} (NZT)</span>
      <span className="text-slate-400 text-xs"> / {bjt} (BJT)</span>
    </div>
  );
}

/** 新建排课：根据新西兰本地 date+time 输入实时预览 */
export function DualTimezonePreview({ date, time, className }: LocalPreviewProps) {
  const label = formatDualTimeFromNzLocal(date, time);
  if (!label) return null;
  return (
    <p className={cn("text-xs text-indigo-600/80 font-medium bg-indigo-50/60 px-3 py-2 rounded-lg", className)}>
      对应时间：{label}
    </p>
  );
}
