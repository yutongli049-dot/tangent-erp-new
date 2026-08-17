/** 学员缴费类型（students.payment_type） */
import { isDrivingSchoolBusiness } from "@/lib/business";

export type PaymentType = "single" | "monthly" | "ten_sessions" | "term" | "custom";

export const PAYMENT_TYPE_OPTIONS: { value: PaymentType; label: string }[] = [
  { value: "single", label: "一课一缴" },
  { value: "monthly", label: "一月一缴" },
  { value: "ten_sessions", label: "十节课一缴" },
  { value: "term", label: "一学期一缴" },
  { value: "custom", label: "自定义" },
];

export const DEFAULT_PAYMENT_TYPE: PaymentType = "monthly";

export function getPaymentTypeLabel(type: string | null | undefined): string {
  return PAYMENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "一月一缴";
}

export type PaymentContext = {
  businessUnitId?: string | null;
  level?: string | null;
};

/** 驾校一单一结：不按预付余额做欠费判定 */
export function isPayAsYouGoDriving(ctx?: PaymentContext): boolean {
  if (isDrivingSchoolBusiness(ctx?.businessUnitId)) return true;
  if (typeof ctx?.level === "string" && /driving/i.test(ctx.level)) return true;
  return false;
}

/**
 * 学员列表「欠费」红标 / 待续费侧栏
 * 仅 balance < 0；balance === 0 视为正常
 * 驾校一单一结不显示负余额欠费报警
 */
export function isPaymentAlert(
  balance: number,
  _paymentType?: string | null,
  ctx?: PaymentContext
): boolean {
  if (isPayAsYouGoDriving(ctx)) return false;
  return Number(balance) < 0;
}

/**
 * Dashboard 待办课程「待缴费」标签
 * - single：仅 balance < 0
 * - 其他预付费：balance <= 0
 * - balance > 0：绝对不显示（禁止用累计待消课时误标）
 * - 驾校一单一结：不显示
 */
export function isBookingUnpaid(
  balance: number,
  paymentType: string | null | undefined,
  _cumulativeUsage?: number,
  ctx?: PaymentContext
): boolean {
  if (isPayAsYouGoDriving(ctx)) return false;
  const bal = Number(balance);
  if (bal > 0) return false;
  const type = paymentType || DEFAULT_PAYMENT_TYPE;
  if (type === "single") return bal < 0;
  return bal <= 0;
}
