import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface TaxLot {
  id: string;
  holding_id: string;
  transaction_id: string | null;
  quantity_original: number;
  quantity_remaining: number;
  cost_per_unit: number;
  currency: string;
  acquired_at: string;
}

export interface TaxLotDisposal {
  id: string;
  sell_transaction_id: string;
  tax_lot_id: string;
  quantity: number;
  cost_per_unit: number;
  sell_price_per_unit: number;
  realized_pnl: number;
}

export function useTaxLots(holdingId?: string) {
  const { user } = useAuth();

  const { data: lots = [], isLoading: lotsLoading } = useQuery({
    queryKey: ["tax-lots", user?.id, holdingId],
    queryFn: async () => {
      let query = supabase
        .from("tax_lots")
        .select("*")
        .eq("user_id", user!.id)
        .order("acquired_at", { ascending: true });

      if (holdingId) {
        query = query.eq("holding_id", holdingId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TaxLot[];
    },
    enabled: !!user,
  });

  const openLots = lots.filter((l) => l.quantity_remaining > 0);
  const closedLots = lots.filter((l) => l.quantity_remaining === 0);

  return {
    lots,
    openLots,
    closedLots,
    isLoading: lotsLoading,
    hasLots: lots.length > 0,
  };
}

export function useTaxLotDisposals(sellTransactionId?: string) {
  const { user } = useAuth();

  const { data: disposals = [], isLoading } = useQuery({
    queryKey: ["tax-lot-disposals", user?.id, sellTransactionId],
    queryFn: async () => {
      if (!sellTransactionId) return [];
      const { data, error } = await supabase
        .from("tax_lot_disposals")
        .select("*")
        .eq("sell_transaction_id", sellTransactionId)
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as TaxLotDisposal[];
    },
    enabled: !!user && !!sellTransactionId,
  });

  return { disposals, isLoading };
}
