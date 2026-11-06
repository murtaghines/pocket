import { useTranslation } from "react-i18next";
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
  const pnlDot = isPositive ? "bg-success" : "bg-destructive";
  const pnlLabel = isPositive ? "text-success" : "text-destructive";

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-[12px]">
      <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
        <div className="flex items-center gap-[6px] mb-[10px]">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary" />
          <span className="text-[13px] font-medium text-primary">{t("portfolio.totalValue")}</span>
        </div>
        <div className="mt-auto">
          <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground">
            {formatCurrency(summary.totalValue, displayCurrency)}
          </div>
        </div>
      </div>

      <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
        <div className="flex items-center gap-[6px] mb-[10px]">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary" />
          <span className="text-[13px] font-medium text-primary">{t("portfolio.costBasis")}</span>
        </div>
        <div className="mt-auto">
          <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground">
            {formatCurrency(summary.totalCostBasis, displayCurrency)}
          </div>
        </div>
      </div>

      <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
        <div className="flex items-center gap-[6px] mb-[10px]">
          <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${pnlDot}`} />
          <span className={`text-[13px] font-medium ${pnlLabel}`}>{t("portfolio.unrealizedPnl")}</span>
        </div>
        <div className="mt-auto">
          <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground">
            {formatCurrency(summary.totalPnl, displayCurrency)}
          </div>
          {summary.totalCostBasis > 0 && (
            <div className="text-[12.5px] mt-[5px] text-muted-foreground truncate">
              <span className={`font-medium ${pnlLabel}`}>
                {isPositive ? "+" : ""}{pnlPercent.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
        <div className="flex items-center gap-[6px] mb-[10px]">
          <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary" />
          <span className="text-[13px] font-medium text-primary">{t("portfolio.holdingsCount")}</span>
        </div>
        <div className="mt-auto">
          <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground">
            {String(summary.holdingsCount)}
          </div>
          <div className="text-[12.5px] mt-[5px] text-muted-foreground truncate">
            {Object.keys(summary.byAssetClass).length} {t("portfolio.assetClasses")}
          </div>
        </div>
      </div>
    </div>
  );
}
