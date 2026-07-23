import { useMemo } from "react";
import type { MonthlyData, Transaction } from "@/lib/mockData";
import {
  spendPaceForMonth,
  weeklyBreakdownForMonth,
  essentialSplitForMonth,
  transactionStatsForMonth,
  dailySpendForMonth,
  coefficientOfVariation,
  mean,
  type SpendPace,
  type WeeklyPoint,
  type EssentialSplit,
  type TransactionStats,
} from "@/lib/analytics";

interface UseMonthlyInsightsArgs {
  transactions: Transaction[];
  monthlyData: MonthlyData[];
  monthKey: string | null;
  /** Convert an EUR-stored amount into the user's base currency. */
  convert: (n: number) => number;
}

export type VolatilityLevel = "steady" | "moderate" | "erratic";

export interface MonthlyInsights {
  spendPace: SpendPace;
  /** Historical average monthly expense (converted), for the pace comparison. */
  avgMonthlyExpenses: number;
  weekly: WeeklyPoint[];
  essentialSplit: EssentialSplit;
  txStats: TransactionStats;
  /** Coefficient of variation of daily spend within the month. */
  dailyVolatility: number;
  volatilityLevel: VolatilityLevel;
}

/**
 * Derived, month-scoped insight metrics for the Dashboard (monthly view). Pure memoized wrappers
 * over `@/lib/analytics` — no fetching. Feed it the already-loaded transactions + monthlyData from
 * `useTransactions` and the `convertToUserCurrency` helper the pages already build.
 */
export function useMonthlyInsights({
  transactions,
  monthlyData,
  monthKey,
  convert,
}: UseMonthlyInsightsArgs): MonthlyInsights {
  return useMemo(() => {
    const spendPace = spendPaceForMonth(transactions, monthKey, convert);
    const weekly = weeklyBreakdownForMonth(transactions, monthKey, convert);
    const essentialSplit = essentialSplitForMonth(transactions, monthKey, convert);
    const txStats = transactionStatsForMonth(transactions, monthKey, convert);

    // Average monthly expense across all *other* months with data (excludes the in-progress
    // current month so the pace benchmark isn't dragged down by a partial month).
    const otherMonths = monthlyData.filter((m) => m.month !== monthKey);
    const avgMonthlyExpenses = Math.round(
      mean((otherMonths.length ? otherMonths : monthlyData).map((m) => convert(m.expenses))) * 100,
    ) / 100;

    // Volatility over days that actually had spend, so a month with many zero days doesn't read
    // as artificially "erratic".
    const spendDays = dailySpendForMonth(transactions, monthKey, convert)
      .map((p) => p.spend)
      .filter((v) => v > 0);
    const dailyVolatility = coefficientOfVariation(spendDays);
    const volatilityLevel: VolatilityLevel =
      dailyVolatility >= 1.2 ? "erratic" : dailyVolatility >= 0.7 ? "moderate" : "steady";

    return {
      spendPace,
      avgMonthlyExpenses,
      weekly,
      essentialSplit,
      txStats,
      dailyVolatility,
      volatilityLevel,
    };
  }, [transactions, monthlyData, monthKey, convert]);
}
