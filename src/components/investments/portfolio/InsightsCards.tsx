import { useTranslation } from "react-i18next";
import { Coins, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useInvestmentInsights } from "@/hooks/useInvestmentInsights";

export function InsightsCards() {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();
  const { insights, isLoading } = useInvestmentInsights();

  if (isLoading || insights.transactionCount === 0) return null;

  const hasDividends = insights.dividendCount > 0;
  const hasFees = insights.feeCount > 0;
  const hasRealized = insights.totalRealizedPnl !== 0;

  if (!hasDividends && !hasFees && !hasRealized) return null;

  const realizedPositive = insights.totalRealizedPnl >= 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-[16px]">
      {hasDividends && (
        <div className="rounded-xl p-[18px_18px_16px] bg-card border border-border shadow-section">
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
              {t("insights.totalDividends")}
            </span>
            <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0 bg-[hsl(270,60%,55%)]/10 text-[hsl(270,60%,55%)]">
              <Coins className="w-[15px] h-[15px]" />
            </div>
          </div>
          <div className="text-[15px] md:text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none truncate text-[hsl(270,60%,55%)]">
            +{formatCurrency(insights.totalDividends)}
          </div>
          <p className="text-[12px] mt-[5px] tabular-nums text-muted-foreground">
            {insights.dividendCount} {t("insights.payments")}
          </p>
        </div>
      )}

      {hasFees && (
        <div className="rounded-xl p-[18px_18px_16px] bg-card border border-border shadow-section">
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
              {t("insights.totalFees")}
            </span>
            <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0 bg-warning/10 text-warning">
              <Receipt className="w-[15px] h-[15px]" />
            </div>
          </div>
          <div className="text-[15px] md:text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none truncate text-warning">
            −{formatCurrency(insights.totalFees)}
          </div>
          {insights.totalBuyVolume > 0 && (
            <p className="text-[12px] mt-[5px] tabular-nums text-muted-foreground">
              {((insights.totalFees / insights.totalBuyVolume) * 100).toFixed(2)}% {t("insights.ofVolume")}
            </p>
          )}
        </div>
      )}

      {hasRealized && (
        <div className="rounded-xl p-[18px_18px_16px] bg-card border border-border shadow-section">
          <div className="flex items-center justify-between mb-[14px]">
            <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
              {t("insights.realizedPnl")}
            </span>
            <div
              className={`flex items-center justify-center w-[30px] h-[30px] rounded-[9px] shrink-0 ${
                realizedPositive
                  ? "bg-success/10 text-success"
                  : "bg-destructive/10 text-destructive"
              }`}
            >
              {realizedPositive ? (
                <TrendingUp className="w-[15px] h-[15px]" />
              ) : (
                <TrendingDown className="w-[15px] h-[15px]" />
              )}
            </div>
          </div>
          <div
            className={`text-[15px] md:text-[20px] font-semibold tracking-[-0.02em] tabular-nums leading-none truncate ${
              realizedPositive ? "text-success" : "text-destructive"
            }`}
          >
            {realizedPositive ? "+" : ""}
            {formatCurrency(insights.totalRealizedPnl)}
          </div>
          <p className="text-[12px] mt-[5px] tabular-nums text-muted-foreground">
            {t("insights.fromSales")}
          </p>
        </div>
      )}
    </div>
  );
}
