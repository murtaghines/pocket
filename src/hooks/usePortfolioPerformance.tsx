import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface SnapshotPoint {
  date: string;
  totalValue: number;
  totalCostBasis: number;
  depositsCumulative: number;
  withdrawalsCumulative: number;
  pnl: number;
}

export interface PerformanceData {
  series: SnapshotPoint[];
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  currentValue: number;
  currentCostBasis: number;
  periodDays: number;
}

const EMPTY: PerformanceData = {
  series: [],
  totalReturn: 0,
  totalReturnPercent: 0,
  annualizedReturn: 0,
  currentValue: 0,
  currentCostBasis: 0,
  periodDays: 0,
};

type Period = "1M" | "3M" | "6M" | "YTD" | "1Y" | "ALL";

function periodToFrom(period: Period): string {
  const now = new Date();
  switch (period) {
    case "1M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 10);
    }
    case "3M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d.toISOString().slice(0, 10);
    }
    case "6M": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      return d.toISOString().slice(0, 10);
    }
    case "YTD":
      return `${now.getFullYear()}-01-01`;
    case "1Y": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      return d.toISOString().slice(0, 10);
    }
    case "ALL":
      return "2000-01-01";
  }
}

export function usePortfolioPerformance(period: Period = "1Y") {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fromDate = periodToFrom(period);
  const toDate = new Date().toISOString().slice(0, 10);

  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ["portfolio-performance", user?.id, period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portfolio_performance", {
        p_user_id: user!.id,
        p_from: fromDate,
        p_to: toDate,
      });
      if (error) throw error;
      if (!data) return EMPTY;

      const d = data as Record<string, unknown>;
      return {
        series: Array.isArray(d.series) ? (d.series as SnapshotPoint[]) : [],
        totalReturn: Number(d.totalReturn ?? 0),
        totalReturnPercent: Number(d.totalReturnPercent ?? 0),
        annualizedReturn: Number(d.annualizedReturn ?? 0),
        currentValue: Number(d.currentValue ?? 0),
        currentCostBasis: Number(d.currentCostBasis ?? 0),
        periodDays: Number(d.periodDays ?? 0),
      } satisfies PerformanceData;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const takeSnapshot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("take_portfolio_snapshot", {
        p_user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio-performance"] });
    },
  });

  return { performance: data, isLoading, takeSnapshot };
}
