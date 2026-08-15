import { useMemo } from "react";
import type { Transaction } from "@/lib/mockData";
import {
  weeklyBreakdownForMonth,
  dailyBreakdownForWeek,
  monthlyBreakdownForYear,
  dailySpendForMonth,
  essentialSplitForPeriod,
  transactionStatsForPeriod,
  periodRangeOf,
  coefficientOfVariation,
  type Granularity,
  type WeeklyPoint,
  type DailyOfWeekPoint,
  type MonthOfYearPoint,
  type EssentialSplit,
  type TransactionStats,
} from "@/lib/analytics";

interface UsePeriodInsightsArgs {
  transactions: Transaction[];
  periodKey: string | null;
  granularity: Granularity;
  /** Convert an EUR-stored amount into the user's base currency. */
  convert: (n: number) => number;
}

export type VolatilityLevel = "steady" | "moderate" | "erratic";

export interface PeriodInsights {
  /** WeeklyPoint[] for month, DailyOfWeekPoint[] for week, MonthOfYearPoint[] for year. */
  subBreakdown: WeeklyPoint[] | DailyOfWeekPoint[] | MonthOfYearPoint[];
  essentialSplit: EssentialSplit;
  txStats: TransactionStats;
  dailyVolatility: number;
  volatilityLevel: VolatilityLevel;
}

/**
 * Derived, period-scoped insight metrics shared by Dashboard's month/week/year tabs. Pure
 * memoized wrappers over `@/lib/analytics` — no fetching. `useMonthlyInsights` is a thin wrapper
 * around this with `granularity: "month"`, kept so the month tab's contract never changes.
 */
export function usePeriodInsights({
  transactions,
  periodKey,
  granularity,
  convert,
}: UsePeriodInsightsArgs): PeriodInsights {
  return useMemo(() => {
    const range = periodKey ? periodRangeOf(periodKey, granularity) : null;
    const essentialSplit = essentialSplitForPeriod(transactions, range, convert);
    const txStats = transactionStatsForPeriod(transactions, range, convert);

    const subBreakdown: PeriodInsights["subBreakdown"] =
      granularity === "week"
        ? dailyBreakdownForWeek(transactions, periodKey, convert)
        : granularity === "year"
        ? monthlyBreakdownForYear(transactions, periodKey, convert)
        : weeklyBreakdownForMonth(transactions, periodKey, convert);

    // Volatility over sub-buckets that actually had spend, so a period with many zero buckets
    // doesn't read as artificially "erratic". Month keeps its original day-level granularity.
    const spendPoints =
      granularity === "month"
        ? dailySpendForMonth(transactions, periodKey, convert).map((p) => p.spend)
        : subBreakdown.map((p) => p.spend);
    const dailyVolatility = coefficientOfVariation(spendPoints.filter((v) => v > 0));
    const volatilityLevel: VolatilityLevel =
      dailyVolatility >= 1.2 ? "erratic" : dailyVolatility >= 0.7 ? "moderate" : "steady";

    return { subBreakdown, essentialSplit, txStats, dailyVolatility, volatilityLevel };
  }, [transactions, periodKey, granularity, convert]);
}
