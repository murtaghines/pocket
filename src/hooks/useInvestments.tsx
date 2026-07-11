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

export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch investments
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

  // Fetch investment accounts
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

  // Upsert investment account
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
    },
  });

  // Delete investment account
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
    },
  });

  // "This month" = the most recent month with actual investment activity, NOT the real
  // wall-clock date. Historical/demo data lives in the past relative to today, so anchoring
  // to new Date() silently showed 0 for every "this month" figure regardless of what data
  // actually existed. Mirrors how useTransactions derives latestMonthKey the same way.
  const currentMonth = investments.length > 0
    ? investments.reduce((latest, inv) => {
        const monthKey = inv.date.slice(0, 7);
        return monthKey > latest ? monthKey : latest;
      }, investments[0].date.slice(0, 7))
    : new Date().toISOString().slice(0, 7); // No data at all — value is moot either way.

  const monthlyInvestments = investments.filter(
    inv => inv.date.startsWith(currentMonth)
  );

  const totalInvestedThisMonth = monthlyInvestments
    .filter(inv => inv.type === 'deposit')
    .reduce((sum, inv) => sum + Math.abs(inv.amount), 0);

  const totalWithdrawnThisMonth = monthlyInvestments
    .filter(inv => inv.type === 'withdrawal')
    .reduce((sum, inv) => sum + Math.abs(inv.amount), 0);

  const netInvestedThisMonth = totalInvestedThisMonth - totalWithdrawnThisMonth;

  // Total current value from accounts
  const totalCurrentValue = accounts.reduce((sum, acc) => sum + acc.current_value, 0);

  // Total invested all time
  const totalInvestedAllTime = investments
    .filter(inv => inv.type === 'deposit')
    .reduce((sum, inv) => sum + Math.abs(inv.amount), 0);

  const totalWithdrawnAllTime = investments
    .filter(inv => inv.type === 'withdrawal')
    .reduce((sum, inv) => sum + Math.abs(inv.amount), 0);

  const netInvestedAllTime = totalInvestedAllTime - totalWithdrawnAllTime;

  // By platform
  const byPlatform = investments.reduce((acc, inv) => {
    if (!acc[inv.platform]) {
      acc[inv.platform] = { deposits: 0, withdrawals: 0, net: 0 };
    }
    if (inv.type === 'deposit') {
      acc[inv.platform].deposits += Math.abs(inv.amount);
    } else {
      acc[inv.platform].withdrawals += Math.abs(inv.amount);
    }
    acc[inv.platform].net = acc[inv.platform].deposits - acc[inv.platform].withdrawals;
    return acc;
  }, {} as Record<string, { deposits: number; withdrawals: number; net: number }>);

  // By asset type
  const byAssetType = investments.reduce((acc, inv) => {
    const type = inv.asset_type || 'Sin clasificar';
    if (!acc[type]) {
      acc[type] = { deposits: 0, withdrawals: 0, net: 0 };
    }
    if (inv.type === 'deposit') {
      acc[type].deposits += Math.abs(inv.amount);
    } else {
      acc[type].withdrawals += Math.abs(inv.amount);
    }
    acc[type].net = acc[type].deposits - acc[type].withdrawals;
    return acc;
  }, {} as Record<string, { deposits: number; withdrawals: number; net: number }>);

  // Monthly history
  const monthlyHistory = investments.reduce((acc, inv) => {
    const month = inv.date.slice(0, 7);
    if (!acc[month]) {
      acc[month] = { month, deposits: 0, withdrawals: 0, net: 0 };
    }
    if (inv.type === 'deposit') {
      acc[month].deposits += Math.abs(inv.amount);
    } else {
      acc[month].withdrawals += Math.abs(inv.amount);
    }
    acc[month].net = acc[month].deposits - acc[month].withdrawals;
    return acc;
  }, {} as Record<string, { month: string; deposits: number; withdrawals: number; net: number }>);

  const monthlyHistoryArray = Object.values(monthlyHistory).sort((a, b) => 
    a.month.localeCompare(b.month)
  );

  return {
    investments,
    accounts,
    isLoading: isLoadingInvestments || isLoadingAccounts,
    hasData: investments.length > 0 || accounts.length > 0,
    
    // Current month (most recent month with data — see comment above, not wall-clock "today")
    currentMonth,
    totalInvestedThisMonth,
    totalWithdrawnThisMonth,
    netInvestedThisMonth,
    
    // All time
    totalInvestedAllTime,
    totalWithdrawnAllTime,
    netInvestedAllTime,
    totalCurrentValue,
    
    // Breakdowns
    byPlatform,
    byAssetType,
    monthlyHistory: monthlyHistoryArray,
    
    // Mutations
    upsertAccount,
    deleteAccount,
  };
}