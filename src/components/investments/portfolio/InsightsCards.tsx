import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import { useInvestmentInsights } from "@/hooks/useInvestmentInsights";

const DIVIDEND_COLOR = "hsl(270,60%,55%)";

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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-[12px]">
      {hasDividends && (
        <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
          <div className="flex items-center gap-[6px] mb-[10px]">
            <span
              className="w-[7px] h-[7px] rounded-full shrink-0"
              style={{ backgroundColor: DIVIDEND_COLOR }}
            />
            <span className="text-[13px] font-medium" style={{ color: DIVIDEND_COLOR }}>
              {t("insights.totalDividends")}
            </span>
          </div>
          <div className="mt-auto">
            <div
              className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none truncate"
              style={{ color: DIVIDEND_COLOR }}
            >
              +{formatCurrency(insights.totalDividends)}
            </div>
            <div className="text-[12.5px] mt-[5px] text-muted-foreground tabular-nums truncate">
              {insights.dividendCount} {t("insights.payments")}
            </div>
          </div>
        </div>
      )}

      {hasFees && (
        <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
          <div className="flex items-center gap-[6px] mb-[10px]">
            <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-warning" />
            <span className="text-[13px] font-medium text-warning">
              {t("insights.totalFees")}
            </span>
          </div>
          <div className="mt-auto">
            <div className="text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none text-foreground truncate">
              −{formatCurrency(insights.totalFees)}
            </div>
            {insights.totalBuyVolume > 0 && (
              <div className="text-[12.5px] mt-[5px] text-muted-foreground tabular-nums truncate">
                {((insights.totalFees / insights.totalBuyVolume) * 100).toFixed(2)}% {t("insights.ofVolume")}
              </div>
            )}
          </div>
        </div>
      )}

      {hasRealized && (
        <div className="flex h-full flex-col rounded-xl px-[14px] py-3 md:px-5 md:py-[14px] shadow-section lg:h-[104px] overflow-hidden bg-card">
          <div className="flex items-center gap-[6px] mb-[10px]">
            <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${realizedPositive ? "bg-success" : "bg-destructive"}`} />
            <span className={`text-[13px] font-medium ${realizedPositive ? "text-success" : "text-destructive"}`}>
              {t("insights.realizedPnl")}
            </span>
          </div>
          <div className="mt-auto">
            <div className={`text-[18px] md:text-[22px] font-medium tracking-[-0.025em] tabular-nums leading-none truncate ${realizedPositive ? "text-success" : "text-destructive"}`}>
              {realizedPositive ? "+" : ""}{formatCurrency(insights.totalRealizedPnl)}
            </div>
            <div className="text-[12.5px] mt-[5px] text-muted-foreground truncate">
              {t("insights.fromSales")}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
