import { useMemo } from "react";
import type { MonthlyData } from "@/lib/mockData";
import {
  historySummary,
  monthOverMonth,
  seasonalIndexByCalendarMonth,
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
  serverWeekday: WeekdaySpend[];
  serverCategoryTrend: CategoryTrend;
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
      hasSeasonalData: granularity === "month" && monthlyData.length >= 12,
      weekday: serverWeekday,
      categoryTrend: serverCategoryTrend,
      rolling,
    };
  }, [monthlyData, granularity, serverWeekday, serverCategoryTrend]);
}
