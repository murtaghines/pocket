import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DividendByHolding {
  ticker: string | null;
  asset_name: string;
  currency: string;
  total: number;
  payment_count: number;
  first_payment: string;
  last_payment: string;
  holding_value: number;
}

export interface DividendByQuarter {
  quarter: string;
  amount: number;
  payment_count: number;
}

export interface DividendByMonth {
  month: string;
  amount: number;
  payment_count: number;
}

export interface DividendCalendarData {
  byHolding: DividendByHolding[];
  byQuarter: DividendByQuarter[];
  byMonth: DividendByMonth[];
  trailing12m: number;
  totalAllTime: number;
  totalPayments: number;
}

const EMPTY: DividendCalendarData = {
  byHolding: [],
  byQuarter: [],
  byMonth: [],
  trailing12m: 0,
  totalAllTime: 0,
  totalPayments: 0,
};

export function useDividendCalendar() {
  const { user } = useAuth();

  const { data = EMPTY, isLoading } = useQuery({
    queryKey: ["dividend-calendar", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dividend_calendar", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      if (!data) return EMPTY;
      const d = data as Record<string, unknown>;
      return {
        byHolding: Array.isArray(d.byHolding) ? (d.byHolding as DividendByHolding[]) : [],
        byQuarter: Array.isArray(d.byQuarter) ? (d.byQuarter as DividendByQuarter[]) : [],
        byMonth: Array.isArray(d.byMonth) ? (d.byMonth as DividendByMonth[]) : [],
        trailing12m: Number(d.trailing12m ?? 0),
        totalAllTime: Number(d.totalAllTime ?? 0),
        totalPayments: Number(d.totalPayments ?? 0),
      } satisfies DividendCalendarData;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return { data, isLoading, hasDividends: data.totalPayments > 0 };
}
