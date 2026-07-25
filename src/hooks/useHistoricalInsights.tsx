import { useMemo } from "react";
import type { MonthlyData, Transaction } from "@/lib/mockData";
import {
  historySummary,
  monthOverMonth,
  seasonalIndexByCalendarMonth,
  weekdaySpending,
  categoryTrends,
  rollingNetByMonths,
  type Granularity,
  type HistorySummary,
  type MonthComparison,
  type SeasonalMonth,
  type WeekdaySpend,
  type CategoryTrend,
  type RollingPoint,
} from "@/lib/analytics";

interface UseHistoricalInsightsArgs {
  transactions: Transaction[];
  /**
   * Period-bucketed series at the selected granularity (already converted to the user's base
   * currency, ascending by period key — the `month` field holds the period key).
   */
  monthlyData: MonthlyData[];
  /** Convert an EUR-stored transaction amount into the user's base currency. */
  convert: (n: number) => number;
  /** Bucketing level the History view is currently showing. */
  granularity: Granularity;
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
  granularity,
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
      // Seasonality is calendar-month by nature; only surfaced at month granularity by TotalView.
      seasonal: seasonalIndexByCalendarMonth(monthlyData),
      hasSeasonalData: granularity === "month" && monthlyData.length >= 12,
      weekday: weekdaySpending(transactions, convert),
      categoryTrend: categoryTrends(transactions, 6, convert, granularity),
      rolling,
    };
  }, [transactions, monthlyData, convert, granularity]);
}
