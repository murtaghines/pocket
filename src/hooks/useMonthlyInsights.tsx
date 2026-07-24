import { useMemo } from "react";
import type { Transaction } from "@/lib/mockData";
import {
  weeklyBreakdownForMonth,
  essentialSplitForMonth,
  transactionStatsForMonth,
  dailySpendForMonth,
  coefficientOfVariation,
  type WeeklyPoint,
  type EssentialSplit,
  type TransactionStats,
} from "@/lib/analytics";

interface UseMonthlyInsightsArgs {
  transactions: Transaction[];
  monthKey: string | null;
  /** Convert an EUR-stored amount into the user's base currency. */
  convert: (n: number) => number;
}

export type VolatilityLevel = "steady" | "moderate" | "erratic";

export interface MonthlyInsights {
  weekly: WeeklyPoint[];
  essentialSplit: EssentialSplit;
  txStats: TransactionStats;
  /** Coefficient of variation of daily spend within the month. */
  dailyVolatility: number;
  volatilityLevel: VolatilityLevel;
}

/**
 * Derived, month-scoped insight metrics for the Dashboard (monthly view). Pure memoized wrappers
 * over `@/lib/analytics` — no fetching. Feed it the already-loaded transactions from
 * `useTransactions` and the `convertToUserCurrency` helper the pages already build.
 */
export function useMonthlyInsights({
  transactions,
  monthKey,
  convert,
}: UseMonthlyInsightsArgs): MonthlyInsights {
  return useMemo(() => {
    const weekly = weeklyBreakdownForMonth(transactions, monthKey, convert);
    const essentialSplit = essentialSplitForMonth(transactions, monthKey, convert);
    const txStats = transactionStatsForMonth(transactions, monthKey, convert);

    // Volatility over days that actually had spend, so a month with many zero days doesn't read
    // as artificially "erratic".
    const spendDays = dailySpendForMonth(transactions, monthKey, convert)
      .map((p) => p.spend)
      .filter((v) => v > 0);
    const dailyVolatility = coefficientOfVariation(spendDays);
    const volatilityLevel: VolatilityLevel =
      dailyVolatility >= 1.2 ? "erratic" : dailyVolatility >= 0.7 ? "moderate" : "steady";

    return {
      weekly,
      essentialSplit,
      txStats,
      dailyVolatility,
      volatilityLevel,
    };
  }, [transactions, monthKey, convert]);
}
