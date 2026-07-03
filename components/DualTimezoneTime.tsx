"use client";

import { cn } from "@/lib/utils";
import {
  formatDualTimeFromNzLocal,
  formatDualTimeParts,
} from "@/lib/timezone";

type UtcProps = {
  utcIso: string;
  className?: string;
  compact?: boolean;
};

type LocalPreviewProps = {
  date: string;
  time: string;
  className?: string;
};

/** 从数据库 UTC 时间渲染中新双时区 */
export function DualTimezoneTime({ utcIso, className, compact }: UtcProps) {
  const { nzt, bjt } = formatDualTimeParts(utcIso);
  if (compact) {
    return (
      <span className={cn("font-mono text-sm", className)}>
        <span className="font-bold text-slate-700">{nzt}</span>
        <span className="text-[10px] text-slate-400 ml-0.5">(NZT)</span>
        <span className="text-slate-300 mx-1">/</span>
        <span className="text-slate-500">{bjt}</span>
        <span className="text-[10px] text-slate-400 ml-0.5">(BJT)</span>
      </span>
    );
  }
  return (
    <div className={cn("text-sm leading-snug", className)}>
      <span className="font-bold font-mono text-slate-800">{nzt} (NZT)</span>
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
