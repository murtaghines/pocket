import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type PeriodStatus = 'OPEN' | 'READY_TO_CLOSE' | 'CLOSED';
export type AppDomain = 'CASHFLOW' | 'INVESTING';

export interface Period {
  id: string;
  user_id: string;
  month_key: string;
  domain: AppDomain;
  status: PeriodStatus;
  closed_at: string | null;
  created_at: string;
}

export function usePeriods(domain?: AppDomain) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: periods = [], isLoading, error } = useQuery({
    queryKey: ['periods', user?.id, domain],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('periods')
        .select('*')
        .eq('user_id', user.id)
        .order('month_key', { ascending: false });
      
      if (domain) {
        query = query.eq('domain', domain);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching periods:', error);
        throw error;
      }

      return (data || []) as Period[];
    },
    enabled: !!user?.id,
  });

  const closePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from('periods')
        .update({ 
          status: 'CLOSED',
          closed_at: new Date().toISOString()
        })
        .eq('id', periodId);

      if (error) throw error;

      // Log to audit (server-validated)
      if (user?.id) {
        await supabase.rpc('log_audit_event', {
          _entity_type: 'period',
          _entity_id: periodId,
          _action: 'close_period',
          _diff: { closed_at: new Date().toISOString() },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast.success('Period closed successfully');
    },
    onError: (error) => {
      console.error('Error closing period:', error);
      toast.error('Error closing period');
    }
  });

  const reopenPeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase
        .from('periods')
        .update({ 
          status: 'OPEN',
          closed_at: null
        })
        .eq('id', periodId);

      if (error) throw error;

      // Log to audit (server-validated)
      if (user?.id) {
        await supabase.rpc('log_audit_event', {
          _entity_type: 'period',
          _entity_id: periodId,
          _action: 'reopen_period',
          _diff: { reopened_at: new Date().toISOString() },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      toast.success('Period reopened successfully');
    },
    onError: (error) => {
      console.error('Error reopening period:', error);
      toast.error('Error reopening period');
    }
  });

  const getPeriodByMonthKey = (monthKey: string, periodDomain: AppDomain): Period | undefined => {
    return periods.find(p => p.month_key === monthKey && p.domain === periodDomain);
  };

  const getLatestPeriod = (periodDomain: AppDomain): Period | undefined => {
    return periods.find(p => p.domain === periodDomain);
  };

  return {
    periods,
    isLoading,
    error,
    closePeriod: closePeriod.mutate,
    reopenPeriod: reopenPeriod.mutate,
    isClosing: closePeriod.isPending,
    isReopening: reopenPeriod.isPending,
    getPeriodByMonthKey,
    getLatestPeriod
  };
}
