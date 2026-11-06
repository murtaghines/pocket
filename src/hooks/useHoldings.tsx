import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useLocalization } from "./useLocalization";

export interface Holding {
  id: string;
  user_id: string;
  account_id: string | null;
  ticker: string | null;
  asset_name: string;
  asset_class: string;
  quantity: number;
  avg_cost_per_unit: number;
  cost_basis: number;
  currency: string;
  current_price: number | null;
  current_value: number;
  unrealized_pnl: number;
  price_updated_at: string | null;
  is_closed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AssetClassBreakdown {
  value: number;
  costBasis: number;
  pnl: number;
  count: number;
}

interface AccountBreakdown {
  accountId: string;
  value: number;
  costBasis: number;
  pnl: number;
  count: number;
}

interface TopHolding {
  id: string;
  assetName: string;
  ticker: string | null;
  assetClass: string;
  currency?: string;
  currentValue: number;
  nativeValue?: number;
  costBasis: number;
  nativeCostBasis?: number;
  pnl: number;
  nativePnl?: number;
  pnlPercent: number;
  weight: number;
  hasRate?: boolean;
}

export interface PortfolioSummary {
  totalValue: number;
  totalCostBasis: number;
  totalPnl: number;
  holdingsCount: number;
  displayCurrency?: string;
  unconvertedCount?: number;
  currencies?: string[];
  byAssetClass: Record<string, AssetClassBreakdown>;
  byAccount: Record<string, AccountBreakdown>;
  topHoldings: TopHolding[];
}

const EMPTY_SUMMARY: PortfolioSummary = {
  totalValue: 0,
  totalCostBasis: 0,
  totalPnl: 0,
  holdingsCount: 0,
  byAssetClass: {},
  byAccount: {},
  topHoldings: [],
};

export function useHoldings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { baseCurrency } = useLocalization();

  const { data: holdings = [], isLoading: isLoadingHoldings } = useQuery({
    queryKey: ["holdings", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holdings")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_closed", false)
        .order("current_value", { ascending: false });

      if (error) throw error;
      return data as Holding[];
    },
    enabled: !!user,
  });

  const isMultiCurrency = holdings.length > 0 &&
    new Set(holdings.map((h) => h.currency)).size > 1;

  const { data: summary = EMPTY_SUMMARY, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["portfolio-summary", user?.id, baseCurrency, isMultiCurrency],
    queryFn: async () => {
      // Use multi-currency RPC when holdings span currencies
      if (isMultiCurrency) {
        const { data, error } = await supabase.rpc("get_portfolio_summary_multicurrency", {
          p_user_id: user!.id,
          p_display_currency: baseCurrency,
          p_rate_type: "official",
        });
        if (error) {
          // Fall back to basic RPC if multicurrency one isn't deployed yet
          console.warn("Multicurrency RPC not available, falling back:", error.message);
          return fetchBasicSummary();
        }
        if (!data) return EMPTY_SUMMARY;
        return parseSummary(data as Record<string, unknown>);
      }

      return fetchBasicSummary();
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  async function fetchBasicSummary(): Promise<PortfolioSummary> {
    const { data, error } = await supabase.rpc("get_portfolio_summary", {
      p_user_id: user!.id,
    });
    if (error) throw error;
    if (!data) return EMPTY_SUMMARY;
    return parseSummary(data as Record<string, unknown>);
  }

  function parseSummary(d: Record<string, unknown>): PortfolioSummary {
    return {
      totalValue: Number(d.totalValue ?? 0),
      totalCostBasis: Number(d.totalCostBasis ?? 0),
      totalPnl: Number(d.totalPnl ?? 0),
      holdingsCount: Number(d.holdingsCount ?? 0),
      displayCurrency: (d.displayCurrency as string) ?? undefined,
      unconvertedCount: d.unconvertedCount != null ? Number(d.unconvertedCount) : undefined,
      currencies: Array.isArray(d.currencies) ? (d.currencies as string[]) : undefined,
      byAssetClass: (d.byAssetClass ?? {}) as Record<string, AssetClassBreakdown>,
      byAccount: (d.byAccount ?? {}) as Record<string, AccountBreakdown>,
      topHoldings: Array.isArray(d.topHoldings)
        ? (d.topHoldings as TopHolding[])
        : [],
    };
  }

  const addHolding = useMutation({
    mutationFn: async (holding: {
      account_id?: string | null;
      ticker?: string | null;
      asset_name: string;
      asset_class: string;
      quantity: number;
      avg_cost_per_unit: number;
      currency?: string;
      current_price?: number | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from("holdings").insert({
        user_id: user!.id,
        account_id: holding.account_id ?? null,
        ticker: holding.ticker ?? null,
        asset_name: holding.asset_name,
        asset_class: holding.asset_class,
        quantity: holding.quantity,
        avg_cost_per_unit: holding.avg_cost_per_unit,
        currency: holding.currency ?? "USD",
        current_price: holding.current_price ?? null,
        price_updated_at: holding.current_price != null ? new Date().toISOString() : null,
        notes: holding.notes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const updateHolding = useMutation({
    mutationFn: async ({
      id,
      ...fields
    }: Partial<Holding> & { id: string }) => {
      const { error } = await supabase
        .from("holdings")
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const updatePrice = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from("holdings")
        .update({
          current_price: price,
          price_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
      if (user) {
        supabase.rpc("take_portfolio_snapshot", { p_user_id: user.id }).catch(() => {});
      }
    },
  });

  const deleteHolding = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("holdings")
        .update({ is_closed: true, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-summary"] });
    },
  });

  const pnlPercent =
    summary.totalCostBasis > 0
      ? (summary.totalPnl / summary.totalCostBasis) * 100
      : 0;

  const currencies = [...new Set(holdings.map((h) => h.currency))];

  return {
    holdings,
    summary,
    isLoading: isLoadingHoldings || isLoadingSummary,
    hasHoldings: holdings.length > 0,
    isMultiCurrency,
    currencies,
    displayCurrency: summary.displayCurrency ?? baseCurrency,
    pnlPercent,
    addHolding,
    updateHolding,
    updatePrice,
    deleteHolding,
  };
}
