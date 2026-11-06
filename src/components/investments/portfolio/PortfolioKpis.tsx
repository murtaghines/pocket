import { useTranslation } from "react-i18next";
import { TrendingUp, TrendingDown, Wallet, PiggyBank, BarChart3 } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import type { PortfolioSummary } from "@/hooks/useHoldings";

interface PortfolioKpisProps {
  summary: PortfolioSummary;
  pnlPercent: number;
  displayCurrency?: string;
}

export function PortfolioKpis({ summary, pnlPercent, displayCurrency }: PortfolioKpisProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  const isPositive = summary.totalPnl >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-[16px]">
      <KpiCard
        label={t("portfolio.totalValue")}
        icon={<Wallet className="w-[15px] h-[15px]" />}
        iconClass="bg-primary/10 text-primary"
        value={formatCurrency(summary.totalValue, displayCurrency)}
        valueClass="text-primary"
      />
      <KpiCard
        label={t("portfolio.costBasis")}
        icon={<PiggyBank className="w-[15px] h-[15px]" />}
        iconClass="bg-primary/10 text-primary"
        value={formatCurrency(summary.totalCostBasis, displayCurrency)}
      />
      <KpiCard
        label={t("portfolio.unrealizedPnl")}
        icon={
          isPositive ? (
            <TrendingUp className="w-[15px] h-[15px]" />
          ) : (
            <TrendingDown className="w-[15px] h-[15px]" />
          )
        }
        iconClass={isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}
        value={formatCurrency(summary.totalPnl, displayCurrency)}
        valueClass={isPositive ? "text-success" : "text-destructive"}
        subtext={summary.totalCostBasis > 0 ? `${isPositive ? "+" : ""}${pnlPercent.toFixed(1)}%` : undefined}
        subtextClass={isPositive ? "text-success" : "text-destructive"}
      />
      <KpiCard
        label={t("portfolio.holdingsCount")}
        icon={<BarChart3 className="w-[15px] h-[15px]" />}
        iconClass="bg-primary/10 text-primary"
        value={String(summary.holdingsCount)}
        subtext={`${Object.keys(summary.byAssetClass).length} ${t("portfolio.assetClasses")}`}
      />
    </div>
  );
}

function KpiCard({
  label,
  icon,
  iconClass,
  value,
  valueClass,
  subtext,
  subtextClass,
}: {
  label: string;
  icon: React.ReactNode;
  iconClass: string;
  value: string;
  valueClass?: string;
  subtext?: string;
  subtextClass?: string;
}) {
  return (
    <div className="rounded-xl p-[18px_18px_16px] bg-card border border-border shadow-section">
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
          {label}
        </span>
        <div
          className={`flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
      <div
        className={`text-[15px] md:text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none truncate ${valueClass ?? "text-foreground"}`}
      >
        {value}
      </div>
      {subtext && (
        <p className={`text-[12px] mt-[5px] tabular-nums ${subtextClass ?? "text-muted-foreground"}`}>
          {subtext}
        </p>
      )}
    </div>
  );
}
