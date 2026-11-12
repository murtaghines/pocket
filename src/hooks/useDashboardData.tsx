import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useAccounts } from "./useAccounts";
import { useUserPreferences } from "./useUserPreferences";
import { useExchangeRates } from "./useExchangeRates";
import type { MonthlyData } from "@/lib/mockData";
import type { Database } from "@/integrations/supabase/types";
import type { Granularity } from "@/lib/analytics";
import type { CurrencyConvert } from "./usePeriodAggregates";

type AppDomain = Database["public"]["Enums"]["app_domain"];

interface UseDashboardDataOptions {
  domain?: AppDomain;
  granularity?: Granularity;
}

/** Ids of accounts the user flagged "exclude from dashboard" (empty when `active` is false). */
export function useHiddenAccountIds(active = true): Set<string> {
  const { accounts } = useAccounts();
  return useMemo(
    () => new Set(active ? accounts.filter((a) => a.hidden_from_dashboard).map((a) => a.id) : []),
    [accounts, active],
  );
}

interface RawSeriesRow {
  month: string;
  currency: string;
  income: number;
  expenses: number;
  balance: number;
  sent_to_invest: number;
}

function aggregateSeriesByCurrency(
  raw: RawSeriesRow[],
  cvt: CurrencyConvert,
): MonthlyData[] {
  const byPeriod = new Map<string, MonthlyData>();
  for (const row of raw) {
    const currency = row.currency || "EUR";
    const existing = byPeriod.get(row.month);
    if (existing) {
      existing.income += cvt(Number(row.income), currency);
      existing.expenses += cvt(Number(row.expenses), currency);
      existing.balance += cvt(Number(row.balance), currency);
      existing.sentToInvest += cvt(Number(row.sent_to_invest), currency);
    } else {
      byPeriod.set(row.month, {
        month: row.month,
        income: cvt(Number(row.income), currency),
        expenses: cvt(Number(row.expenses), currency),
        balance: cvt(Number(row.balance), currency),
        sentToInvest: cvt(Number(row.sent_to_invest), currency),
      });
    }
  }
  return Array.from(byPeriod.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function useDashboardData(options: UseDashboardDataOptions = {}) {
  const { domain = "CASHFLOW", granularity = "month" } = options;
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const userCurrency = preferences?.base_currency || "EUR";

  const cvt: CurrencyConvert = (n, currency) => convertAmount(n, currency, userCurrency);

  const { data: rawSeries = [], isLoading: isLoadingSeries } = useQuery({
    queryKey: ["dashboard-period-series", user?.id, domain, granularity],
    queryFn: async () => {
      if (granularity === "month") {
        const { data, error } = await supabase.rpc("get_monthly_series", {
          p_user_id: user!.id,
          p_domain: domain,
        });
        if (error) throw error;
        return (data ?? []).map((row: any): RawSeriesRow => ({
          month: row.month,
          currency: row.currency || "EUR",
          income: Number(row.income),
          expenses: Number(row.expenses),
          balance: Number(row.balance),
          sent_to_invest: Number(row.sent_to_invest),
        }));
      }
      const { data, error } = await supabase.rpc("get_period_series", {
        p_user_id: user!.id,
        p_domain: domain,
        p_granularity: granularity,
      });
      if (error) throw error;
      return (data ?? []).map((row: any): RawSeriesRow => ({
        month: row.period,
        currency: row.currency || "EUR",
        income: Number(row.income),
        expenses: Number(row.expenses),
        balance: Number(row.balance),
        sent_to_invest: Number(row.sent_to_invest),
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const monthlyData = useMemo(
    () => aggregateSeriesByCurrency(rawSeries, cvt),
    [rawSeries, convertAmount, userCurrency],
  );

  const { data: rawOpeningBalances = [], isLoading: isLoadingBalances } = useQuery({
    queryKey: ["dashboard-opening-balances", user?.id, domain],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_opening_balances", {
        p_user_id: user!.id,
        p_domain: domain,
      });
      if (error) throw error;
      return (data ?? []) as Array<{ month: string; currency: string; opening_balance: number }>;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const openingBalanceByMonth = useMemo(() => {
    const result: Record<string, number> = {};
    for (const row of rawOpeningBalances) {
      const currency = row.currency || "EUR";
      result[row.month] = (result[row.month] ?? 0) + cvt(Number(row.opening_balance), currency);
    }
    return result;
  }, [rawOpeningBalances, convertAmount, userCurrency]);

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

export function useAccountPeriodSummary(
  monthKey: string | null,
  domain: Database["public"]["Enums"]["app_domain"] = "CASHFLOW",
  excludeAccountIds?: Set<string>,
  excludeHidden = false,
) {
  const { user } = useAuth();
  const hiddenIds = useHiddenAccountIds(excludeHidden);
  const { preferences } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const userCurrency = preferences?.base_currency || "EUR";

  const range = useMemo(() => {
    if (!monthKey) return null;
    const [y, m] = monthKey.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const end = `${y}-${String(m).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    return { start, end };
  }, [monthKey]);

  const excludeKey = [...(excludeAccountIds ?? []), ...[...hiddenIds].map((id) => `hidden:${id}`)].sort().join(",");

  const { data = { total: null as number | null, byAccount: {} as Record<string, number> }, isLoading } = useQuery({
    queryKey: ["account-period-summary", user?.id, domain, monthKey, excludeKey, userCurrency],
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
      (data ?? []).forEach((row: { account_id: string; currency: string; latest_balance: number }) => {
        const currency = row.currency || "EUR";
        const bal = convertAmount(Number(row.latest_balance), currency, userCurrency);
        byAccount[row.account_id] = bal;
        if (!excludeAccountIds?.has(row.account_id) && !hiddenIds.has(row.account_id)) total += bal;
      });
      return { total: Math.round(total * 100) / 100, byAccount };
    },
    enabled: !!user && !!range,
    staleTime: 30_000,
  });

  return { closingBalance: data.total, accountClosingBalances: data.byAccount, isLoading };
}

export function usePeriodSummaryByRange(
  startDate: string | null,
  endDate: string | null,
  domain: Database["public"]["Enums"]["app_domain"] = "CASHFLOW",
) {
  const { user } = useAuth();
  const hiddenIds = useHiddenAccountIds(true);
  const hiddenKey = [...hiddenIds].sort().join(",");
  const { preferences } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const userCurrency = preferences?.base_currency || "EUR";

  const { data = { total: null as number | null, byAccount: {} as Record<string, number> }, isLoading } = useQuery({
    queryKey: ["account-period-summary", user?.id, domain, startDate, endDate, hiddenKey, userCurrency],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_account_period_summary", {
        p_user_id: user!.id,
        p_start: startDate!,
        p_end: endDate!,
        p_domain: domain,
      });
      if (error) throw error;
      const byAccount: Record<string, number> = {};
      let total = 0;
      (data ?? []).forEach((row: { account_id: string; currency: string; latest_balance: number }) => {
        const currency = row.currency || "EUR";
        const bal = convertAmount(Number(row.latest_balance), currency, userCurrency);
        byAccount[row.account_id] = bal;
        if (!hiddenIds.has(row.account_id)) total += bal;
      });
      return { total: Math.round(total * 100) / 100, byAccount };
    },
    enabled: !!user && !!startDate && !!endDate,
    staleTime: 30_000,
  });

  return { closingBalance: data.total, accountClosingBalances: data.byAccount, isLoading };
}

export function useOpeningBalance(date: string | null, domain: Database["public"]["Enums"]["app_domain"] = "CASHFLOW") {
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");
  const userCurrency = preferences?.base_currency || "EUR";

  const { data: openingBalance = null, isLoading } = useQuery({
    queryKey: ["opening-balance-at-date", user?.id, domain, date, userCurrency],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_balance_at_date" as any, {
        p_user_id: user!.id,
        p_domain: domain,
        p_date: date!,
      });
      if (error) throw error;
      if (Array.isArray(data)) {
        let total = 0;
        for (const row of data as Array<{ currency: string; balance: number }>) {
          total += convertAmount(Number(row.balance), row.currency || "EUR", userCurrency);
        }
        return Math.round(total * 100) / 100;
      }
      const n = Number(data);
      return isNaN(n) ? 0 : n;
    },
    enabled: !!user && !!date,
    staleTime: 30_000,
  });

  return { openingBalance, isLoading };
}
