import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type InvestmentTxType = "buy" | "sell" | "dividend" | "fee";

export interface InvestmentTransaction {
  id: string;
  user_id: string;
  holding_id: string | null;
  account_id: string | null;
  import_id: string | null;
  type: InvestmentTxType;
  ticker: string | null;
  asset_name: string | null;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  fee: number;
  currency: string;
  exchange_rate: number | null;
  realized_pnl: number | null;
  notes: string | null;
  date: string;
  created_at: string;
}

export interface UseInvestmentTransactionsOptions {
  holdingId?: string;
  importIds?: string[];
  monthKey?: string;
}

export function useInvestmentTransactions(opts?: UseInvestmentTransactionsOptions | string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const holdingId = typeof opts === "string" ? opts : opts?.holdingId;
  const importIds = typeof opts === "string" ? undefined : opts?.importIds;
  const monthKey = typeof opts === "string" ? undefined : opts?.monthKey;

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["investment-transactions", user?.id, holdingId, importIds, monthKey],
    queryFn: async () => {
      let query = supabase
        .from("investment_transactions")
        .select("*")
        .eq("user_id", user!.id)
        .order("date", { ascending: false });

      if (holdingId) {
        query = query.eq("holding_id", holdingId);
      }

      if (importIds && importIds.length > 0) {
        query = query.in("import_id", importIds);
      }

      if (monthKey) {
        const [year, month] = monthKey.split("-").map(Number);
        const start = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = new Date(year, month, 0);
        const end = `${year}-${String(month).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
        query = query.gte("date", start).lte("date", end);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as InvestmentTransaction[];
    },
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: async (tx: {
      holding_id?: string | null;
      account_id?: string | null;
      type: InvestmentTxType;
      ticker?: string | null;
      asset_name?: string | null;
      quantity: number;
      price_per_unit: number;
      fee?: number;
      currency?: string;
      exchange_rate?: number | null;
      notes?: string | null;
      date?: string;
    }) => {
      const { error } = await supabase.from("investment_transactions").insert({
        user_id: user!.id,
        holding_id: tx.holding_id ?? null,
        account_id: tx.account_id ?? null,
        type: tx.type,
        ticker: tx.ticker ?? null,
        asset_name: tx.asset_name ?? null,
        quantity: tx.quantity,
        price_per_unit: tx.price_per_unit,
        fee: tx.fee ?? 0,
        currency: tx.currency ?? "USD",
        exchange_rate: tx.exchange_rate ?? null,
        notes: tx.notes ?? null,
        date: tx.date ?? new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      supabase.rpc("take_portfolio_snapshot", { p_user_id: user!.id }).catch(() => {});
    },
  });

  const deleteTransaction = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("investment_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const updateTransaction = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      const { error } = await supabase
        .from("investment_transactions")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["investment-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  return {
    transactions,
    isLoading,
    addTransaction,
    deleteTransaction,
    updateTransaction,
  };
}
