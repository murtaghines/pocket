import { useMemo } from "react";
import type { MonthlyData, Transaction } from "@/lib/mockData";
import {
  historySummary,
  monthOverMonth,
  seasonalIndexByCalendarMonth,
  weekdaySpending,
  categoryTrends,
  rollingNetByMonths,
  type HistorySummary,
  type MonthComparison,
  type SeasonalMonth,
  type WeekdaySpend,
  type CategoryTrend,
  type RollingPoint,
} from "@/lib/analytics";

interface UseHistoricalInsightsArgs {
  transactions: Transaction[];
  /** Already converted to the user's base currency (as History builds it). Ascending by month. */
  monthlyData: MonthlyData[];
  /** Convert an EUR-stored transaction amount into the user's base currency. */
  convert: (n: number) => number;
}

/** Rolling windows offered by the UI, in months (~30/90/180 days). */
export const ROLLING_WINDOWS = [1, 3, 6] as const;
export type RollingWindow = (typeof ROLLING_WINDOWS)[number];

export interface HistoricalInsights {
  summary: HistorySummary;
  monthComparisons: MonthComparison[];
  seasonal: SeasonalMonth[];
  /** Whether there is enough history (>= 12 months) for seasonality to be meaningful. */
  hasSeasonalData: boolean;
  weekday: WeekdaySpend[];
  categoryTrend: CategoryTrend;
  rolling: Record<RollingWindow, RollingPoint[]>;
}

/**
 * Derived, all-time insight metrics for the History view. Pure memoized wrappers over
 * `@/lib/analytics`. `monthlyData` is expected pre-converted (History already converts); raw
 * `transactions` are converted here via `convert` for the weekday/category-trend breakdowns.
 */
export function useHistoricalInsights({
  transactions,
  monthlyData,
  convert,
}: UseHistoricalInsightsArgs): HistoricalInsights {
  return useMemo(() => {
    const rolling = ROLLING_WINDOWS.reduce(
      (acc, w) => {
        acc[w] = rollingNetByMonths(monthlyData, w);
        return acc;
      },
      {} as Record<RollingWindow, RollingPoint[]>,
    );

    return {
      summary: historySummary(monthlyData),
      monthComparisons: monthOverMonth(monthlyData),
      seasonal: seasonalIndexByCalendarMonth(monthlyData),
      hasSeasonalData: monthlyData.length >= 12,
      weekday: weekdaySpending(transactions, convert),
      categoryTrend: categoryTrends(transactions, 6, convert),
      rolling,
    };
  }, [transactions, monthlyData, convert]);
}
