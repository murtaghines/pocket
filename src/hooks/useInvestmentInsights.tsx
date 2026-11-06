import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface MonthlyAmount {
  month: string;
  amount: number;
}

export interface InvestmentInsights {
  totalDividends: number;
  totalFees: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  totalRealizedPnl: number;
  transactionCount: number;
  dividendCount: number;
  feeCount: number;
  dividendsByMonth: MonthlyAmount[];
  feesByMonth: MonthlyAmount[];
}

const EMPTY: InvestmentInsights = {
  totalDividends: 0,
  totalFees: 0,
  totalBuyVolume: 0,
  totalSellVolume: 0,
  totalRealizedPnl: 0,
  transactionCount: 0,
  dividendCount: 0,
  feeCount: 0,
  dividendsByMonth: [],
  feesByMonth: [],
};

export function useInvestmentInsights() {
  const { user } = useAuth();

  const { data: insights = EMPTY, isLoading } = useQuery({
    queryKey: ["investment-insights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investment_insights", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      if (!data) return EMPTY;
      const d = data as Record<string, unknown>;
      return {
        totalDividends: Number(d.totalDividends ?? 0),
        totalFees: Number(d.totalFees ?? 0),
        totalBuyVolume: Number(d.totalBuyVolume ?? 0),
        totalSellVolume: Number(d.totalSellVolume ?? 0),
        totalRealizedPnl: Number(d.totalRealizedPnl ?? 0),
        transactionCount: Number(d.transactionCount ?? 0),
        dividendCount: Number(d.dividendCount ?? 0),
        feeCount: Number(d.feeCount ?? 0),
        dividendsByMonth: Array.isArray(d.dividendsByMonth)
          ? (d.dividendsByMonth as MonthlyAmount[])
          : [],
        feesByMonth: Array.isArray(d.feesByMonth)
          ? (d.feesByMonth as MonthlyAmount[])
          : [],
      } satisfies InvestmentInsights;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { insights, isLoading };
}
