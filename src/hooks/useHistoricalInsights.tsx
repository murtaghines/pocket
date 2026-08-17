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
  monthlyData: MonthlyData[];
  granularity: Granularity;
  serverWeekday?: WeekdaySpend[];
  serverCategoryTrend?: CategoryTrend;
  /** @deprecated Only needed when server data is not provided. */
  transactions?: Transaction[];
  /** @deprecated Only needed when server data is not provided. */
  convert?: (n: number) => number;
}

/** Rolling windows offered by the UI, in months (~30/90/180 days). */
export const ROLLING_WINDOWS = [1, 3, 6] as const;
export type RollingWindow = (typeof ROLLING_WINDOWS)[number];

export interface HistoricalInsights {
  summary: HistorySummary;
  monthComparisons: MonthComparison[];
  seasonal: SeasonalMonth[];
  hasSeasonalData: boolean;
  weekday: WeekdaySpend[];
  categoryTrend: CategoryTrend;
  rolling: Record<RollingWindow, RollingPoint[]>;
}

export function useHistoricalInsights({
  monthlyData,
  granularity,
  serverWeekday,
  serverCategoryTrend,
  transactions,
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

    const weekday = serverWeekday
      ?? weekdaySpending(transactions ?? [], convert);
    const categoryTrend = serverCategoryTrend
      ?? categoryTrends(transactions ?? [], 6, convert, granularity);

    return {
      summary: historySummary(monthlyData),
      monthComparisons: monthOverMonth(monthlyData),
      seasonal: seasonalIndexByCalendarMonth(monthlyData),
      hasSeasonalData: granularity === "month" && monthlyData.length >= 12,
      weekday,
      categoryTrend,
      rolling,
    };
  }, [monthlyData, granularity, serverWeekday, serverCategoryTrend, transactions, convert]);
}
