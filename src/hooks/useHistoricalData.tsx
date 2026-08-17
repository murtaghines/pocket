import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { WeekdaySpend, CategoryTrend, CategoryTrendSeries, Granularity } from "@/lib/analytics";
import type { Database } from "@/integrations/supabase/types";

type AppDomain = Database["public"]["Enums"]["app_domain"];

interface UseHistoricalDataOptions {
  domain?: AppDomain;
  granularity?: Granularity;
  topN?: number;
}

export function useHistoricalData(options: UseHistoricalDataOptions = {}) {
  const { domain = "CASHFLOW", granularity = "month", topN = 6 } = options;
  const { user } = useAuth();

  const { data: weekday = [], isLoading: isLoadingWeekday } = useQuery({
    queryKey: ["historical-weekday-spending", user?.id, domain],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_weekday_spending", {
        p_user_id: user!.id,
        p_domain: domain,
      });
      if (error) throw error;
      const byWeekday = new Map<number, { totalSpend: number; txCount: number; avgSpend: number }>();
      (data ?? []).forEach((row: { weekday: number; total_spend: number; tx_count: number; avg_spend: number }) => {
        byWeekday.set(row.weekday, {
          totalSpend: Number(row.total_spend),
          txCount: Number(row.tx_count),
          avgSpend: Number(row.avg_spend),
        });
      });
      return Array.from({ length: 7 }, (_, w): WeekdaySpend => ({
        weekday: w,
        totalSpend: byWeekday.get(w)?.totalSpend ?? 0,
        txCount: byWeekday.get(w)?.txCount ?? 0,
        avgSpend: byWeekday.get(w)?.avgSpend ?? 0,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: categoryTrend = { months: [], series: [] }, isLoading: isLoadingTrends } = useQuery({
    queryKey: ["historical-category-trends", user?.id, domain, granularity, topN],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_category_trends", {
        p_user_id: user!.id,
        p_domain: domain,
        p_granularity: granularity,
        p_top_n: topN,
      });
      if (error) throw error;
      const periodsSet = new Set<string>();
      const slugSet = new Set<string>();
      const map: Record<string, Record<string, number>> = {};
      (data ?? []).forEach((row: { period: string; slug: string; total: number }) => {
        periodsSet.add(row.period);
        slugSet.add(row.slug);
        map[row.slug] = map[row.slug] || {};
        map[row.slug][row.period] = Number(row.total);
      });
      const months = Array.from(periodsSet).sort();
      const series: CategoryTrendSeries[] = Array.from(slugSet).map((slug) => ({
        slug,
        values: months.map((m) => map[slug]?.[m] ?? 0),
      }));
      series.sort((a, b) => {
        if (a.slug === "other_expense") return 1;
        if (b.slug === "other_expense") return -1;
        const totalA = a.values.reduce((s, v) => s + v, 0);
        const totalB = b.values.reduce((s, v) => s + v, 0);
        return totalB - totalA;
      });
      return { months, series } as CategoryTrend;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return {
    weekday,
    categoryTrend,
    isLoading: isLoadingWeekday || isLoadingTrends,
  };
}
