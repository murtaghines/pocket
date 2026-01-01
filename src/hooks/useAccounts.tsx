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
  institution: string | null;
  account_role: AccountRole;
  domain_default: AppDomain | null;
  currency_base: string;
  created_at: string;
}

interface CreateAccountParams {
  name: string;
  institution?: string;
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

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: params.name,
          institution: params.institution,
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
      toast.success('Cuenta creada correctamente');
    },
    onError: (error) => {
      console.error('Error creating account:', error);
      if (error.message.includes('unique')) {
        toast.error('Ya existe una cuenta con ese nombre');
      } else {
        toast.error('Error al crear la cuenta');
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
      toast.success('Cuenta actualizada correctamente');
    },
    onError: (error) => {
      console.error('Error updating account:', error);
      toast.error('Error al actualizar la cuenta');
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
      toast.success('Cuenta eliminada correctamente');
    },
    onError: (error) => {
      console.error('Error deleting account:', error);
      toast.error('Error al eliminar la cuenta');
    }
  });

  const getAccountByName = (name: string): Account | undefined => {
    return accounts.find(a => a.name.toLowerCase() === name.toLowerCase());
  };

  const getCashAccounts = (): Account[] => {
    return accounts.filter(a => a.account_role === 'CASH');
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
    isCreating: createAccount.isPending,
    isUpdating: updateAccount.isPending,
    isDeleting: deleteAccount.isPending,
    getAccountByName,
    getCashAccounts,
    getInvestmentAccounts
  };
}
