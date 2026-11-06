import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Coins,
} from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import type { PortfolioHighlights as Highlights } from "@/hooks/usePortfolioHighlights";
import type { InvestmentInsights } from "@/hooks/useInvestmentInsights";

interface PortfolioHighlightsProps {
  highlights: Highlights;
  insights: InvestmentInsights;
  displayCurrency?: string;
}

export function PortfolioHighlights({
  highlights,
  insights,
  displayCurrency,
}: PortfolioHighlightsProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const { bestPosition, worstPosition, winRate } = highlights;

  return (
    <div className="grid gap-2.5 md:gap-[16px] grid-cols-2 lg:grid-cols-5">
      {/* YTD Return or Daily placeholder */}
      <HighlightCard
        label={highlights.ytdReturnPct != null ? t("highlights.ytdReturn") : t("highlights.totalReturn")}
        value={
          highlights.ytdReturnPct != null
            ? `${highlights.ytdReturnPct >= 0 ? "+" : ""}${highlights.ytdReturnPct.toFixed(2)}%`
            : "—"
        }
        valueClass={
          highlights.ytdReturnPct == null
            ? "text-muted-foreground"
            : highlights.ytdReturnPct >= 0
              ? "text-success"
              : "text-destructive"
        }
        icon={
          highlights.ytdReturnPct == null || highlights.ytdReturnPct >= 0 ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )
        }
        iconClass={
          highlights.ytdReturnPct == null
            ? "bg-muted text-muted-foreground"
            : highlights.ytdReturnPct >= 0
              ? "bg-success/10 text-success"
              : "bg-destructive/10 text-destructive"
        }
      />

      {/* Best position */}
      <HighlightCard
        label={t("highlights.bestPosition")}
        value={bestPosition?.ticker ?? bestPosition?.name ?? "—"}
        valueClass={bestPosition ? "text-success" : "text-muted-foreground"}
        sub={
          bestPosition
            ? `${formatCurrency(bestPosition.pnl, displayCurrency)} (${bestPosition.pnlPct >= 0 ? "+" : ""}${bestPosition.pnlPct.toFixed(2)}%)`
            : undefined
        }
        icon={<Trophy className="w-3.5 h-3.5" />}
        iconClass="bg-success/10 text-success"
      />

      {/* Worst position */}
      <HighlightCard
        label={t("highlights.worstPosition")}
        value={worstPosition?.ticker ?? worstPosition?.name ?? "—"}
        valueClass={worstPosition ? "text-destructive" : "text-muted-foreground"}
        sub={
          worstPosition
            ? `${formatCurrency(worstPosition.pnl, displayCurrency)} (${worstPosition.pnlPct.toFixed(2)}%)`
            : undefined
        }
        icon={<TrendingDown className="w-3.5 h-3.5" />}
        iconClass="bg-destructive/10 text-destructive"
      />

      {/* Win rate */}
      <HighlightCard
        label={t("highlights.winRate")}
        value={
          winRate.total > 0 ? `${winRate.pct.toFixed(0)}%` : "—"
        }
        valueClass={
          winRate.total === 0
            ? "text-muted-foreground"
            : winRate.pct >= 50
              ? "text-success"
              : "text-destructive"
        }
        sub={
          winRate.total > 0
            ? `${winRate.wins}W / ${winRate.losses}L`
            : undefined
        }
        icon={<Target className="w-3.5 h-3.5" />}
        iconClass="bg-primary/10 text-primary"
      />

      {/* Dividends collected */}
      <HighlightCard
        label={t("highlights.dividendsCollected")}
        value={
          insights.dividendCount > 0
            ? formatCurrency(insights.totalDividends, displayCurrency)
            : "—"
        }
        valueClass={
          insights.dividendCount > 0
            ? "text-[hsl(270,60%,55%)]"
            : "text-muted-foreground"
        }
        sub={
          insights.dividendCount > 0
            ? `${insights.dividendCount} ${t("insights.payments")}`
            : undefined
        }
        icon={<Coins className="w-3.5 h-3.5" />}
        iconClass="bg-[hsl(270,60%,55%)]/10 text-[hsl(270,60%,55%)]"
      />
    </div>
  );
}

function HighlightCard({
  label,
  value,
  valueClass,
  sub,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-xl p-3 md:p-[18px_18px_16px] bg-card border border-border shadow-section flex flex-col">
      <div className="flex items-center gap-1.5 mb-2">
        <div
          className={`flex items-center justify-center w-[24px] h-[24px] md:w-[28px] md:h-[28px] rounded-[7px] shrink-0 ${iconClass}`}
        >
          {icon}
        </div>
        <span className="text-[10px] md:text-[11px] font-semibold uppercase tracking-[.1em] md:tracking-[.14em] text-muted-foreground leading-tight">
          {label}
        </span>
      </div>
      <p
        className={`text-[15px] md:text-[18px] font-semibold tabular-nums tracking-[-0.01em] leading-tight truncate mt-auto ${valueClass ?? "text-foreground"}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] md:text-[11px] text-muted-foreground tabular-nums mt-1 truncate">
          {sub}
        </p>
      )}
    </div>
  );
}
