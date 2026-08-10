/** 财务币种：独立轨道，不做自动汇率折算 */
export type Currency = "NZD" | "RMB";

export const CURRENCY_OPTIONS: { value: Currency; label: string; symbol: string }[] = [
  { value: "NZD", label: "NZD ($)", symbol: "$" },
  { value: "RMB", label: "RMB (¥)", symbol: "¥" },
];

export const DEFAULT_CURRENCY: Currency = "NZD";

export function normalizeCurrency(value: string | null | undefined): Currency {
  return value === "RMB" ? "RMB" : "NZD";
}

export function currencySymbol(currency: Currency | string | null | undefined): string {
  return normalizeCurrency(currency) === "RMB" ? "¥" : "$";
}

export function formatMoney(
  amount: number,
  currency: Currency | string | null | undefined = "NZD"
): string {
  const sym = currencySymbol(currency);
  const n = Number(amount) || 0;
  const abs = Math.abs(n).toLocaleString();
  return `${n < 0 ? "-" : ""}${sym}${abs}`;
}

export type DualCurrencyTotals = {
  NZD: { income: number; expense: number; net: number };
  RMB: { income: number; expense: number; net: number };
};

export function emptyDualTotals(): DualCurrencyTotals {
  return {
    NZD: { income: 0, expense: 0, net: 0 },
    RMB: { income: 0, expense: 0, net: 0 },
  };
}

/** 按币种独立汇总流水（不折算） */
export function aggregateByCurrency(
  transactions: { type: string; amount: number | string; currency?: string | null }[]
): DualCurrencyTotals {
  const totals = emptyDualTotals();
  for (const t of transactions) {
    const cur = normalizeCurrency(t.currency);
    const amt = Number(t.amount) || 0;
    if (t.type === "income") totals[cur].income += amt;
    else if (t.type === "expense") totals[cur].expense += Math.abs(amt);
  }
  totals.NZD.net = totals.NZD.income - totals.NZD.expense;
  totals.RMB.net = totals.RMB.income - totals.RMB.expense;
  return totals;
}
