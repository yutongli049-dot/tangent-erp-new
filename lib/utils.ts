import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 课时 → 毫秒，支持 0.5 步进（如 1.5h） */
export function durationToMs(hours: number): number {
  return Math.round(hours * 3600 * 1000);
}

/** 课时加减后保留一位小数，避免浮点长尾 */
export function roundHours(hours: number): number {
  return Number(hours.toFixed(1));
}
