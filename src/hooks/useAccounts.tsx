import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type AccountRole = 'CASH' | 'INVESTMENT';
export type AppDomain = 'CASHFLOW' | 'INVESTING';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  institution: string;
  account_role: AccountRole;
  domain_default: AppDomain | null;
  currency_base: string;
  created_at: string;
  color: string | null;
  is_primary: boolean;
  hidden_from_dashboard?: boolean;
}

interface CreateAccountParams {
  /** The bank/platform, e.g. "Revolut", "Santander". */
  institution: string;
  /** Optional nickname to tell apart two accounts at the same bank, e.g. "Personal",
   *  "Shared". Defaults to `institution` when left blank. */
  name?: string;
  color?: string;
  account_role?: AccountRole;
  domain_default?: AppDomain;
  currency_base?: string;
}

export function useAccounts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounts', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching accounts:', error);
        throw error;
      }

      return (data || []) as Account[];
    },
    enabled: !!user?.id,
  });

  const createAccount = useMutation({
    mutationFn: async (params: CreateAccountParams) => {
      if (!user?.id) throw new Error('User not authenticated');

      const institution = params.institution.trim();
      const name = params.name?.trim() || institution;

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name,
          institution,
          color: params.color,
          account_role: params.account_role || 'CASH',
          domain_default: params.domain_default,
          currency_base: params.currency_base || 'EUR'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account created successfully');
    },
    onError: (error) => {
      console.error('Error creating account:', error);
      if (error.message.includes('unique')) {
        toast.error('You already have an account with that bank and nickname');
      } else {
        toast.error('Error creating account');
      }
    }
  });

  const updateAccount = useMutation({
    mutationFn: async ({ id, ...params }: Partial<Account> & { id: string }) => {
      const { error } = await supabase
        .from('accounts')
        .update(params)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account updated successfully');
    },
    onError: (error) => {
      console.error('Error updating account:', error);
      toast.error('Error updating account');
    }
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Account deleted successfully');
    },
    onError: (error) => {
      console.error('Error deleting account:', error);
      toast.error('Error deleting account');
    }
  });

  const updateAccountColor = useMutation({
    mutationFn: async ({ id, color }: { id: string; color: string }) => {
      const { error } = await supabase
        .from('accounts')
        .update({ color })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (error) => {
      console.error('Error updating account color:', error);
      toast.error('Error updating color');
    }
  });

  const setPrimaryAccount = useMutation({
    mutationFn: async (id: string) => {
      // The DB trigger ensures only one primary per user; just set this one to true.
      const { error } = await supabase
        .from('accounts')
        .update({ is_primary: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      toast.success('Primary account updated');
    },
    onError: (error) => {
      console.error('Error setting primary account:', error);
      toast.error('Error setting primary account');
    }
  });

  const unsetPrimaryAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .update({ is_primary: false })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
    onError: (error) => {
      console.error('Error unsetting primary account:', error);
      toast.error('Error updating primary account');
    }
  });

  const reassignAndDelete = useMutation({
    mutationFn: async ({ deleteId, reassignToId }: { deleteId: string; reassignToId: string }) => {
      // Reassign imports
      const { error: importErr } = await supabase
        .from('imports')
        .update({ account_id: reassignToId })
        .eq('account_id', deleteId);
      if (importErr) throw importErr;

      // Reassign transactions
      const { error: txErr } = await supabase
        .from('transactions')
        .update({ account_id: reassignToId })
        .eq('account_id', deleteId);
      if (txErr) throw txErr;

      // Now delete the account
      const { error: delErr } = await supabase
        .from('accounts')
        .delete()
        .eq('id', deleteId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Account reassigned and deleted');
    },
    onError: (error) => {
      console.error('Error reassigning account:', error);
      toast.error('Error deleting account');
    }
  });

  const getLinkedDataCount = async (accountId: string) => {
    const [importsResult, transactionsResult] = await Promise.all([
      supabase
        .from('imports')
        .select('id, uploaded_at, periods(month_key)')
        .eq('account_id', accountId),
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('account_id', accountId),
    ]);

    const importsData = importsResult.data || [];
    const monthKeys = importsData
      .map((i) => (i.periods as { month_key?: string } | null)?.month_key)
      .filter((m): m is string => !!m)
      .sort();

    const sortedByDate = [...importsData].sort((a, b) =>
      (b.uploaded_at || '').localeCompare(a.uploaded_at || '')
    );

    return {
      importsCount: importsData.length,
      transactionsCount: transactionsResult.count || 0,
      firstMonth: monthKeys[0] || null,
      lastMonth: monthKeys[monthKeys.length - 1] || null,
      lastImportAt: sortedByDate[0]?.uploaded_at || null,
    };
  };

  const getAccountByName = (name: string): Account | undefined => {
    return accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
  };

  const getCashAccounts = ({ includeHidden = false }: { includeHidden?: boolean } = {}): Account[] => {
    return accounts.filter(
      (a) => a.account_role === 'CASH' && (includeHidden || !a.hidden_from_dashboard)
    );
  };

  const getInvestmentAccounts = (): Account[] => {
    return accounts.filter(a => a.account_role === 'INVESTMENT');
  };

  return {
    accounts,
    isLoading,
    error,
    createAccount: createAccount.mutate,
    updateAccount: updateAccount.mutate,
    deleteAccount: deleteAccount.mutate,
    reassignAndDelete: reassignAndDelete.mutate,
    updateAccountColor: updateAccountColor.mutate,
    setPrimaryAccount: setPrimaryAccount.mutate,
    unsetPrimaryAccount: unsetPrimaryAccount.mutate,
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending || reassignAndDelete.isPending,
    getLinkedDataCount,
    getAccountByName,
    getCashAccounts,
    getInvestmentAccounts
  };
}
