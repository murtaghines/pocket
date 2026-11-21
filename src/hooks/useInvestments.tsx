import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface InvestmentAccount {
  id: string;
  user_id: string;
  platform: string;
  account_name: string;
  current_value: number;
  last_updated: string;
  created_at: string;
}

/**
 * Hook for the legacy `investment_accounts` table (manual portfolio value tracking).
 * The `investments` table is deprecated — all transaction data now lives in
 * `investment_transactions` (see `useInvestmentTransactions`).
 */
export function useInvestments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
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

  return {
    accounts,
    isLoading,
    hasData: accounts.length > 0,
    upsertAccount,
    deleteAccount,
  };
}
