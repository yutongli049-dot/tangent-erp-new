/** 学员缴费类型（students.payment_type） */
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

/**
 * 红灯 / 待续费判定
 * - single（一课一缴）：balance <= -1 才报警
 * - 其他预付费类型：balance <= 0 即报警
 */
export function isPaymentAlert(
  balance: number,
  paymentType: string | null | undefined
): boolean {
  const bal = Number(balance);
  const type = paymentType || DEFAULT_PAYMENT_TYPE;
  if (type === "single") return bal <= -1;
  return bal <= 0;
}

/**
 * 待办课程「待缴费」标签判定
 * - single：仅当学员已欠费（balance <= -1）
 * - 预付费：累计待消课时超过余额，或余额已耗尽
 */
export function isBookingUnpaid(
  balance: number,
  paymentType: string | null | undefined,
  cumulativeUsage: number
): boolean {
  const bal = Number(balance);
  const type = paymentType || DEFAULT_PAYMENT_TYPE;
  if (type === "single") return bal <= -1;
  return cumulativeUsage > bal || bal <= 0;
}
