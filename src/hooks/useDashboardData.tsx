import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { MonthlyData } from "@/lib/mockData";
import type { Database } from "@/integrations/supabase/types";
import type { Granularity } from "@/lib/analytics";

type AppDomain = Database["public"]["Enums"]["app_domain"];

interface UseDashboardDataOptions {
  domain?: AppDomain;
  granularity?: Granularity;
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { domain = "CASHFLOW", granularity = "month" } = options;
  const { user } = useAuth();

  const { data: monthlyData = [], isLoading: isLoadingSeries } = useQuery({
    queryKey: ["dashboard-period-series", user?.id, domain, granularity],
    queryFn: async () => {
      if (granularity === "month") {
        const { data, error } = await supabase.rpc("get_monthly_series", {
          p_user_id: user!.id,
          p_domain: domain,
        });
        if (error) throw error;
        return (data ?? []).map((row: { month: string; income: number; expenses: number; balance: number; sent_to_invest: number }): MonthlyData => ({
          month: row.month,
          income: Number(row.income),
          expenses: Number(row.expenses),
          balance: Number(row.balance),
          sentToInvest: Number(row.sent_to_invest),
        }));
      }
      const { data, error } = await supabase.rpc("get_period_series", {
        p_user_id: user!.id,
        p_domain: domain,
        p_granularity: granularity,
      });
      if (error) throw error;
      return (data ?? []).map((row: { period: string; income: number; expenses: number; balance: number; sent_to_invest: number }): MonthlyData => ({
        month: row.period,
        income: Number(row.income),
        expenses: Number(row.expenses),
        balance: Number(row.balance),
        sentToInvest: Number(row.sent_to_invest),
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const { data: openingBalanceByMonth = {}, isLoading: isLoadingBalances } = useQuery({
    queryKey: ["dashboard-opening-balances", user?.id, domain],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_opening_balances", {
        p_user_id: user!.id,
        p_domain: domain,
      });
      if (error) throw error;
      const result: Record<string, number> = {};
      (data ?? []).forEach((row: { month: string; opening_balance: number }) => {
        result[row.month] = Number(row.opening_balance);
      });
      return result;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  return {
    monthlyData,
    openingBalanceByMonth,
    isLoading: isLoadingSeries || isLoadingBalances,
    hasData: monthlyData.length > 0,
  };
}
