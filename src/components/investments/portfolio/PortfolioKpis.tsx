import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import type { PortfolioSummary } from "@/hooks/useHoldings";
import type { InvestmentInsights } from "@/hooks/useInvestmentInsights";

interface PortfolioKpisProps {
  summary: PortfolioSummary;
  pnlPercent: number;
  displayCurrency?: string;
  ytdReturnPct: number | null;
  insights: InvestmentInsights;
}

export function PortfolioKpis({
  summary,
  pnlPercent,
  displayCurrency,
  ytdReturnPct,
  insights,
}: PortfolioKpisProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const isPositivePnl = summary.totalPnl >= 0;
  const pnlDot = isPositivePnl ? "bg-success" : "bg-destructive";
  const pnlLabel = isPositivePnl ? "text-success" : "text-destructive";

  const ytdUp = ytdReturnPct == null || ytdReturnPct >= 0;
  const ytdColor = ytdReturnPct == null
    ? { dot: "bg-muted-foreground", label: "text-muted-foreground" }
    : ytdUp
      ? { dot: "bg-success", label: "text-success" }
      : { dot: "bg-destructive", label: "text-destructive" };

  const hasDividends = insights.dividendCount > 0;
  const hasRealized = insights.totalRealizedPnl !== 0;
  const realizedPositive = insights.totalRealizedPnl >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
      {/* Cost Basis */}
      <KpiCard
        dotClass="bg-primary"
        labelClass="text-primary"
        label={t("portfolio.costBasis")}
        value={formatCurrency(summary.totalCostBasis, displayCurrency)}
      />

      {/* Unrealized P&L */}
      <KpiCard
        dotClass={pnlDot}
        labelClass={pnlLabel}
        label={t("portfolio.unrealizedPnl")}
        value={formatCurrency(summary.totalPnl, displayCurrency)}
        sub={
          summary.totalCostBasis > 0
            ? `${isPositivePnl ? "+" : ""}${pnlPercent.toFixed(1)}%`
            : undefined
        }
        subClass={pnlLabel}
      />

      {/* YTD Return */}
      <KpiCard
        dotClass={ytdColor.dot}
        labelClass={ytdColor.label}
        label={ytdReturnPct != null ? t("highlights.ytdReturn") : t("highlights.totalReturn")}
        value={
          ytdReturnPct != null
            ? `${ytdReturnPct >= 0 ? "+" : ""}${ytdReturnPct.toFixed(2)}%`
            : "—"
        }
      />

      {/* Dividends or Realized P&L */}
      {hasDividends ? (
        <KpiCard
          dotClass="bg-[hsl(var(--dividend))]"
          labelClass="text-[hsl(var(--dividend))]"
          label={t("insights.totalDividends")}
          value={`+${formatCurrency(insights.totalDividends, displayCurrency)}`}
          sub={`${insights.dividendCount} ${t("insights.payments")}`}
        />
      ) : hasRealized ? (
        <KpiCard
          dotClass={realizedPositive ? "bg-success" : "bg-destructive"}
          labelClass={realizedPositive ? "text-success" : "text-destructive"}
          label={t("insights.realizedPnl")}
          value={`${realizedPositive ? "+" : ""}${formatCurrency(insights.totalRealizedPnl, displayCurrency)}`}
          sub={t("insights.fromSales")}
        />
      ) : (
        <KpiCard
          dotClass="bg-primary"
          labelClass="text-primary"
          label={t("portfolio.holdingsCount")}
          value={String(summary.holdingsCount)}
          sub={`${Object.keys(summary.byAssetClass).length} ${t("portfolio.assetClasses")}`}
        />
      )}
    </div>
  );
}

function KpiCard({
  dotClass,
  labelClass,
  label,
  value,
  sub,
  subClass,
}: {
  dotClass: string;
  labelClass: string;
  label: string;
  value: string;
  sub?: string;
  subClass?: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
      <div className="flex items-center gap-[6px] mb-[10px]">
        <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotClass}`} />
        <span className={`text-[13px] font-medium ${labelClass}`}>{label}</span>
      </div>
      <div className="mt-auto">
        <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground truncate">
          {value}
        </div>
        {sub && (
          <div className={`text-[12.5px] mt-[5px] tabular-nums truncate ${subClass ?? "text-muted-foreground"}`}>
            {sub}
          </div>
        )}
      </div>
    </div>
  );
}
