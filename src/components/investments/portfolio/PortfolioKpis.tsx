import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Banknote,
  Target,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PORTFOLIO_GRID, KPI_LEFT_GRID, KPI_RIGHT_GRID } from "./portfolioGridLayout";
import type { PortfolioSummary } from "@/hooks/useHoldings";
import type { InvestmentInsights } from "@/hooks/useInvestmentInsights";
import type { WinRate } from "@/hooks/usePortfolioHighlights";

interface PortfolioKpisProps {
  summary: PortfolioSummary;
  pnlPercent: number;
  displayCurrency?: string;
  ytdReturnPct: number | null;
  insights: InvestmentInsights;
  winRate: WinRate;
  yieldOnCost: number;
}

type Tone = "primary" | "success" | "destructive" | "muted";

const TONES: Record<Tone, {
  bg: string; label: string; value: string; sub: string; iconBg: string;
}> = {
  primary: {
    bg: "bg-primary/5", label: "text-primary/80", value: "text-primary",
    sub: "text-primary/60", iconBg: "bg-primary/10 text-primary",
  },
  success: {
    bg: "bg-success/5", label: "text-success/80", value: "text-success",
    sub: "text-success/60", iconBg: "bg-success/10 text-success",
  },
  destructive: {
    bg: "bg-destructive/5", label: "text-destructive/80", value: "text-destructive",
    sub: "text-destructive/60", iconBg: "bg-destructive/10 text-destructive",
  },
  muted: {
    bg: "bg-card", label: "text-muted-foreground", value: "text-muted-foreground",
    sub: "text-muted-foreground/60", iconBg: "bg-muted text-muted-foreground",
  },
};

function valueTone(val: number): Tone {
  if (val > 0) return "success";
  if (val < 0) return "destructive";
  return "muted";
}

function KpiCard({
  tone,
  label,
  value,
  sub,
  icon,
}: {
  tone: Tone;
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <Card variant="bento" className={cn(t.bg, "sm:h-[128px] flex flex-col")}>
      <CardContent className="p-4 md:p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <p className={cn("text-xs font-medium uppercase tracking-wide", t.label)}>
            {label}
          </p>
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center", t.iconBg)}>
            {icon}
          </div>
        </div>
        <p className={cn("text-[17px] md:text-[20px] font-semibold tracking-tight tabular-nums", t.value)}>
          {value}
        </p>
        {sub && (
          <p className={cn("text-xs mt-auto truncate", t.sub)}>{sub}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DividendKpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card
      variant="bento"
      className="sm:h-[128px] flex flex-col"
      style={{ backgroundColor: "hsl(var(--dividend) / 0.05)" }}
    >
      <CardContent className="p-4 md:p-5 flex flex-col h-full">
        <div className="flex items-start justify-between mb-2">
          <p
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: "hsl(var(--dividend) / 0.8)" }}
          >
            {label}
          </p>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[hsl(var(--dividend))]"
            style={{ backgroundColor: "hsl(var(--dividend) / 0.1)" }}
          >
            <Banknote className="w-4 h-4" strokeWidth={2.5} />
          </div>
        </div>
        <p className="text-[17px] md:text-[20px] font-semibold tracking-tight tabular-nums text-[hsl(var(--dividend))]">
          {value}
        </p>
        <p
          className="text-xs mt-auto truncate"
          style={{ color: "hsl(var(--dividend) / 0.6)" }}
        >
          {sub}
        </p>
      </CardContent>
    </Card>
  );
}

export function PortfolioKpis({
  summary,
  pnlPercent,
  displayCurrency,
  ytdReturnPct,
  insights,
  winRate,
  yieldOnCost,
}: PortfolioKpisProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const pnlT = valueTone(summary.totalPnl);
  const ytdT = ytdReturnPct == null || ytdReturnPct === 0 ? "muted" as Tone : valueTone(ytdReturnPct);

  const hasDividends = insights.dividendCount > 0;
  const hasRealized = insights.totalRealizedPnl !== 0;
  const hasWinRate = winRate.total > 0;
  const realizedT = valueTone(insights.totalRealizedPnl);

  return (
    <div className={PORTFOLIO_GRID}>
      {/* Left: Portfolio Value · Unrealized P&L · YTD Return */}
      <div className={KPI_LEFT_GRID}>
        <KpiCard
          tone="primary"
          label={t("portfolio.totalValue")}
          value={formatCurrency(summary.totalValue, displayCurrency)}
          sub={`${t("portfolio.costBasis")}: ${formatCurrency(summary.totalCostBasis, displayCurrency)}`}
          icon={<Wallet className="w-4 h-4" strokeWidth={2.5} />}
        />

        <KpiCard
          tone={pnlT}
          label={t("portfolio.unrealizedPnl")}
          value={`${summary.totalPnl > 0 ? "+" : ""}${formatCurrency(summary.totalPnl, displayCurrency)}`}
          sub={
            summary.totalCostBasis > 0
              ? `${summary.totalPnl > 0 ? "+" : ""}${pnlPercent.toFixed(1)}%`
              : undefined
          }
          icon={
            summary.totalPnl >= 0
              ? <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
              : <TrendingDown className="w-4 h-4" strokeWidth={2.5} />
          }
        />

        <KpiCard
          tone={ytdT}
          label={ytdReturnPct != null ? t("highlights.ytdReturn") : t("highlights.totalReturn")}
          value={
            ytdReturnPct != null
              ? `${ytdReturnPct > 0 ? "+" : ""}${ytdReturnPct.toFixed(2)}%`
              : "—"
          }
          icon={<BarChart3 className="w-4 h-4" strokeWidth={2.5} />}
        />
      </div>

      {/* Right: Dividends/Realized/Holdings · Win Rate/Holdings */}
      <div className={KPI_RIGHT_GRID}>
        {hasDividends ? (
          <DividendKpiCard
            label={t("insights.totalDividends")}
            value={`+${formatCurrency(insights.totalDividends, displayCurrency)}`}
            sub={
              yieldOnCost > 0
                ? `${insights.dividendCount} ${t("insights.payments")} · ${yieldOnCost.toFixed(1)}% ${t("highlights.yocShort")}`
                : `${insights.dividendCount} ${t("insights.payments")}`
            }
          />
        ) : hasRealized ? (
          <KpiCard
            tone={realizedT}
            label={t("insights.realizedPnl")}
            value={`${insights.totalRealizedPnl > 0 ? "+" : ""}${formatCurrency(insights.totalRealizedPnl, displayCurrency)}`}
            sub={t("insights.fromSales")}
            icon={
              insights.totalRealizedPnl >= 0
                ? <TrendingUp className="w-4 h-4" strokeWidth={2.5} />
                : <TrendingDown className="w-4 h-4" strokeWidth={2.5} />
            }
          />
        ) : (
          <KpiCard
            tone="primary"
            label={t("portfolio.holdingsCount")}
            value={String(summary.holdingsCount)}
            sub={`${Object.keys(summary.byAssetClass).length} ${t("portfolio.assetClasses")}`}
            icon={<Layers className="w-4 h-4" strokeWidth={2.5} />}
          />
        )}

        {hasWinRate ? (
          <KpiCard
            tone="primary"
            label={t("highlights.winRate")}
            value={`${winRate.pct.toFixed(0)}%`}
            sub={t("highlights.winsOfTotal", { wins: winRate.wins, total: winRate.total })}
            icon={<Target className="w-4 h-4" strokeWidth={2.5} />}
          />
        ) : (
          <KpiCard
            tone="primary"
            label={t("portfolio.holdingsCount")}
            value={String(summary.holdingsCount)}
            sub={`${Object.keys(summary.byAssetClass).length} ${t("portfolio.assetClasses")}`}
            icon={<Layers className="w-4 h-4" strokeWidth={2.5} />}
          />
        )}
      </div>
    </div>
  );
}
