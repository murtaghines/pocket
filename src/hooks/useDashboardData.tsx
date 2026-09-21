import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
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

export function useAccountOpeningBalances(monthKey: string | null, domain: Database["public"]["Enums"]["app_domain"] = "CASHFLOW") {
  const { user } = useAuth();

  const { data: balances = {}, isLoading } = useQuery({
    queryKey: ["account-opening-balances", user?.id, domain, monthKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_account_opening_balances", {
        p_user_id: user!.id,
        p_domain: domain,
        p_month: monthKey!,
      });
      if (error) throw error;
      const result: Record<string, number> = {};
      (data ?? []).forEach((row: { account_id: string; opening_balance: number }) => {
        result[row.account_id] = Number(row.opening_balance);
      });
      return result;
    },
    enabled: !!user && !!monthKey,
    staleTime: 30_000,
  });

  return { accountOpeningBalances: balances, isLoading };
}

export function useAccountPeriodSummary(monthKey: string | null, domain: Database["public"]["Enums"]["app_domain"] = "CASHFLOW") {
  const { user } = useAuth();

  const range = useMemo(() => {
    if (!monthKey) return null;
    const [y, m] = monthKey.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }, [monthKey]);

  const { data = { total: null as number | null, byAccount: {} as Record<string, number> }, isLoading } = useQuery({
    queryKey: ["account-period-summary", user?.id, domain, monthKey],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_account_period_summary", {
        p_user_id: user!.id,
        p_start: range!.start,
        p_end: range!.end,
        p_domain: domain,
      });
      if (error) throw error;
      const byAccount: Record<string, number> = {};
      let total = 0;
      (data ?? []).forEach((row: { account_id: string; latest_balance: number }) => {
        const bal = Number(row.latest_balance);
        byAccount[row.account_id] = bal;
        total += bal;
      });
      return { total: Math.round(total * 100) / 100, byAccount };
    },
    enabled: !!user && !!range,
    staleTime: 30_000,
  });

  return { closingBalance: data.total, accountClosingBalances: data.byAccount, isLoading };
}

export function useOpeningBalance(date: string | null, domain: Database["public"]["Enums"]["app_domain"] = "CASHFLOW") {
  const { user } = useAuth();

  const { data: openingBalance = null, isLoading } = useQuery({
    queryKey: ["opening-balance-at-date", user?.id, domain, date],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_balance_at_date", {
        p_user_id: user!.id,
        p_domain: domain,
        p_date: date!,
      });
      if (error) throw error;
      const n = Number(data);
      return isNaN(n) ? 0 : n;
    },
    enabled: !!user && !!date,
    staleTime: 30_000,
  });

  return { openingBalance, isLoading };
}
