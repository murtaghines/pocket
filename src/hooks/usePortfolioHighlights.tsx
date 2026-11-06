import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { Holding, PortfolioSummary } from "./useHoldings";
import type { InvestmentInsights } from "./useInvestmentInsights";

export interface WinRate {
  wins: number;
  losses: number;
  total: number;
  pct: number;
}

export interface PortfolioInfo {
  assetsTraded: number;
  firstOperation: string | null;
  lastOperation: string | null;
  totalMovements: number;
}

export interface CurrencyExposure {
  currency: string;
  value: number;
  pct: number;
}

export interface BestWorst {
  id: string;
  name: string;
  ticker: string | null;
  pnl: number;
  pnlPct: number;
}

export interface PortfolioHighlights {
  winRate: WinRate;
  info: PortfolioInfo;
  ytdReturnPct: number | null;
  bestPosition: BestWorst | null;
  worstPosition: BestWorst | null;
  currencyExposure: CurrencyExposure[];
  yieldOnCost: number;
  yieldOnCurrent: number;
}

const EMPTY_WIN: WinRate = { wins: 0, losses: 0, total: 0, pct: 0 };
const EMPTY_INFO: PortfolioInfo = {
  assetsTraded: 0,
  firstOperation: null,
  lastOperation: null,
  totalMovements: 0,
};

function computeBestWorst(holdings: Holding[]): {
  best: BestWorst | null;
  worst: BestWorst | null;
} {
  const open = holdings.filter((h) => !h.is_closed && h.quantity > 0);
  if (open.length === 0) return { best: null, worst: null };

  let best: Holding = open[0];
  let worst: Holding = open[0];
  let bestPct = best.cost_basis > 0 ? best.unrealized_pnl / best.cost_basis : 0;
  let worstPct = bestPct;

  for (const h of open) {
    const pct = h.cost_basis > 0 ? h.unrealized_pnl / h.cost_basis : 0;
    if (pct > bestPct) {
      best = h;
      bestPct = pct;
    }
    if (pct < worstPct) {
      worst = h;
      worstPct = pct;
    }
  }

  return {
    best: {
      id: best.id,
      name: best.asset_name,
      ticker: best.ticker,
      pnl: best.unrealized_pnl,
      pnlPct: bestPct * 100,
    },
    worst:
      worst.id !== best.id
        ? {
            id: worst.id,
            name: worst.asset_name,
            ticker: worst.ticker,
            pnl: worst.unrealized_pnl,
            pnlPct: worstPct * 100,
          }
        : null,
  };
}

function computeCurrencyExposure(holdings: Holding[]): CurrencyExposure[] {
  const open = holdings.filter((h) => !h.is_closed && h.quantity > 0);
  const byCurrency: Record<string, number> = {};
  let total = 0;

  for (const h of open) {
    byCurrency[h.currency] = (byCurrency[h.currency] ?? 0) + h.current_value;
    total += h.current_value;
  }

  if (total === 0) return [];

  return Object.entries(byCurrency)
    .map(([currency, value]) => ({
      currency,
      value,
      pct: (value / total) * 100,
    }))
    .sort((a, b) => b.value - a.value);
}

export function usePortfolioHighlights(
  holdings: Holding[],
  summary: PortfolioSummary,
  insights: InvestmentInsights,
) {
  const { user } = useAuth();

  const { data: serverData, isLoading } = useQuery({
    queryKey: ["portfolio-highlights", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_portfolio_highlights", {
        p_user_id: user!.id,
      });
      if (error) throw error;
      return data as Record<string, unknown>;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const winRate: WinRate = serverData?.winRate
    ? (serverData.winRate as WinRate)
    : EMPTY_WIN;

  const info: PortfolioInfo = serverData?.info
    ? (serverData.info as PortfolioInfo)
    : EMPTY_INFO;

  let ytdReturnPct: number | null = null;
  if (serverData?.ytdStartValue && summary.totalValue > 0) {
    const startVal = Number(serverData.ytdStartValue);
    if (startVal > 0) {
      ytdReturnPct = ((summary.totalValue - startVal) / startVal) * 100;
    }
  }

  const { best: bestPosition, worst: worstPosition } =
    computeBestWorst(holdings);

  const currencyExposure = computeCurrencyExposure(holdings);

  const yieldOnCost =
    summary.totalCostBasis > 0
      ? (insights.totalDividends / summary.totalCostBasis) * 100
      : 0;
  const yieldOnCurrent =
    summary.totalValue > 0
      ? (insights.totalDividends / summary.totalValue) * 100
      : 0;

  const highlights: PortfolioHighlights = {
    winRate,
    info,
    ytdReturnPct,
    bestPosition,
    worstPosition,
    currencyExposure,
    yieldOnCost,
    yieldOnCurrent,
  };

  return { highlights, isLoading };
}
