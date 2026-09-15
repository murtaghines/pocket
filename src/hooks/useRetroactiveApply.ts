import { useMemo } from "react";
import type { MatchedTransaction } from "./useRulePreview";

export type RetroScope = "this_month" | "last_3_months" | "all" | "custom";

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return startOfMonth(d);
}

export function filterByScope(
  transactions: MatchedTransaction[],
  scope: RetroScope,
  customSinceDate?: string,
): string[] {
  if (scope === "all") return transactions.map((t) => t.id);

  let since: Date;
  if (scope === "this_month") {
    since = startOfMonth(new Date());
  } else if (scope === "last_3_months") {
    since = monthsAgo(3);
  } else if (scope === "custom" && customSinceDate) {
    since = new Date(customSinceDate);
  } else {
    return transactions.map((t) => t.id);
  }

  return transactions.filter((t) => new Date(t.date) >= since).map((t) => t.id);
}

export function useRetroactiveCounts(transactions: MatchedTransaction[]) {
  return useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const threeMonthsStart = monthsAgo(3);

    let thisMonth = 0;
    let last3Months = 0;
    const all = transactions.length;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d >= thisMonthStart) thisMonth++;
      if (d >= threeMonthsStart) last3Months++;
    }

    return { thisMonth, last3Months, all };
  }, [transactions]);
}
