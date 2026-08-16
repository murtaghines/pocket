import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Investment {
  id: string;
  user_id: string;
  upload_id: string | null;
  date: string;
  amount: number;
  platform: string;
  asset_type: string | null;
  description: string;
  type: 'deposit' | 'withdrawal';
  is_hidden: boolean;
  created_at: string;
}

interface InvestmentAccount {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  current_value: number;
  last_updated: string;
  created_at: string;
}

interface PlatformBreakdown {
  deposits: number;
  withdrawals: number;
  net: number;
}

interface MonthlyHistoryEntry {
  month: string;
  deposits: number;
  withdrawals: number;
  net: number;
}

interface InvestmentSummary {
  currentMonth: string;
  totalInvestedThisMonth: number;
  totalWithdrawnThisMonth: number;
  netInvestedThisMonth: number;
  totalInvestedAllTime: number;
  totalWithdrawnAllTime: number;
  netInvestedAllTime: number;
  totalCurrentValue: number;
  byPlatform: Record<string, PlatformBreakdown>;
  byAssetType: Record<string, PlatformBreakdown>;
  monthlyHistory: MonthlyHistoryEntry[];
}

const EMPTY_SUMMARY: InvestmentSummary = {
  currentMonth: new Date().toISOString().slice(0, 7),
  totalInvestedThisMonth: 0,
  totalWithdrawnThisMonth: 0,
  netInvestedThisMonth: 0,
  totalInvestedAllTime: 0,
  totalWithdrawnAllTime: 0,
  netInvestedAllTime: 0,
  totalCurrentValue: 0,
  byPlatform: {},
  byAssetType: {},
  monthlyHistory: [],
};

export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: investments = [], isLoading: isLoadingInvestments } = useQuery({
    queryKey: ['investments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user!.id)
        .eq('is_hidden', false)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Investment[];
    },
    enabled: !!user,
  });

  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['investment_accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_accounts')
        .select('*')
        .eq('user_id', user!.id)
        .order('platform');

      if (error) throw error;
      return data as InvestmentAccount[];
    },
    enabled: !!user,
  });

  const { data: summary = EMPTY_SUMMARY, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['investment-summary', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_investment_summary", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      if (!data) return EMPTY_SUMMARY;

      const d = data as Record<string, unknown>;
      const byPlatform: Record<string, PlatformBreakdown> = {};
      if (d.byPlatform && typeof d.byPlatform === "object") {
        for (const [k, v] of Object.entries(d.byPlatform as Record<string, Record<string, number>>)) {
          byPlatform[k] = { deposits: Number(v.deposits), withdrawals: Number(v.withdrawals), net: Number(v.net) };
        }
      }

      const byAssetType: Record<string, PlatformBreakdown> = {};
      if (d.byAssetType && typeof d.byAssetType === "object") {
        for (const [k, v] of Object.entries(d.byAssetType as Record<string, Record<string, number>>)) {
          byAssetType[k] = { deposits: Number(v.deposits), withdrawals: Number(v.withdrawals), net: Number(v.net) };
        }
      }

      const monthlyHistory: MonthlyHistoryEntry[] = Array.isArray(d.monthlyHistory)
        ? (d.monthlyHistory as Array<Record<string, unknown>>).map((e) => ({
            month: String(e.month),
            deposits: Number(e.deposits),
            withdrawals: Number(e.withdrawals),
            net: Number(e.net),
          }))
        : [];

      return {
        currentMonth: String(d.currentMonth),
        totalInvestedThisMonth: Number(d.totalInvestedThisMonth),
        totalWithdrawnThisMonth: Number(d.totalWithdrawnThisMonth),
        netInvestedThisMonth: Number(d.netInvestedThisMonth),
        totalInvestedAllTime: Number(d.totalInvestedAllTime),
        totalWithdrawnAllTime: Number(d.totalWithdrawnAllTime),
        netInvestedAllTime: Number(d.netInvestedAllTime),
        totalCurrentValue: Number(d.totalCurrentValue),
        byPlatform,
        byAssetType,
        monthlyHistory,
      } satisfies InvestmentSummary;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const upsertAccount = useMutation({
    mutationFn: async ({ platform, account_name, current_value }: {
      platform: string;
      account_name: string;
      current_value: number
    }) => {
      const { error } = await supabase
        .from('investment_accounts')
        .upsert({
          user_id: user!.id,
          platform,
          account_name,
          current_value,
          last_updated: new Date().toISOString(),
        }, {
          onConflict: 'user_id,platform,account_name'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['investment-summary'] });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async (accountId: string) => {
      const { error } = await supabase
        .from('investment_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['investment_accounts'] });
      queryClient.invalidateQueries({ queryKey: ['investment-summary'] });
    },
  });

  return {
    investments,
    accounts,
    isLoading: isLoadingInvestments || isLoadingAccounts || isLoadingSummary,
    hasData: investments.length > 0 || accounts.length > 0,

    currentMonth: summary.currentMonth,
    totalInvestedThisMonth: summary.totalInvestedThisMonth,
    totalWithdrawnThisMonth: summary.totalWithdrawnThisMonth,
    netInvestedThisMonth: summary.netInvestedThisMonth,

    totalInvestedAllTime: summary.totalInvestedAllTime,
    totalWithdrawnAllTime: summary.totalWithdrawnAllTime,
    netInvestedAllTime: summary.netInvestedAllTime,
    totalCurrentValue: summary.totalCurrentValue,

    byPlatform: summary.byPlatform,
    byAssetType: summary.byAssetType,
    monthlyHistory: summary.monthlyHistory,

    upsertAccount,
    deleteAccount,
  };
}
