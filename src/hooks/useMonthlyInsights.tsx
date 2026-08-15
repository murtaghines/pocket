import type { Transaction } from "@/lib/mockData";
import { usePeriodInsights, type VolatilityLevel } from "@/hooks/usePeriodInsights";
import type { WeeklyPoint, EssentialSplit, TransactionStats } from "@/lib/analytics";

interface UseMonthlyInsightsArgs {
  transactions: Transaction[];
  monthKey: string | null;
  /** Convert an EUR-stored amount into the user's base currency. */
  convert: (n: number) => number;
}

export type { VolatilityLevel };

export interface MonthlyInsights {
  weekly: WeeklyPoint[];
  essentialSplit: EssentialSplit;
  txStats: TransactionStats;
  /** Coefficient of variation of daily spend within the month. */
  dailyVolatility: number;
  volatilityLevel: VolatilityLevel;
}

/**
 * Derived, month-scoped insight metrics for the Dashboard (monthly view). Thin wrapper around the
 * granularity-generic `usePeriodInsights` — kept so the month tab's contract never changes.
 */
export function useMonthlyInsights({ transactions, monthKey, convert }: UseMonthlyInsightsArgs): MonthlyInsights {
  const period = usePeriodInsights({ transactions, periodKey: monthKey, granularity: "month", convert });
  return {
    weekly: period.subBreakdown as WeeklyPoint[],
    essentialSplit: period.essentialSplit,
    txStats: period.txStats,
    dailyVolatility: period.dailyVolatility,
    volatilityLevel: period.volatilityLevel,
  };
}
