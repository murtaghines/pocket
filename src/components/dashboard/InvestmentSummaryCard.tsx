import { useInvestments } from "@/hooks/useInvestments";
import { useHoldings } from "@/hooks/useHoldings";
import { useLocalization } from "@/hooks/useLocalization";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function InvestmentSummaryCard() {
  const { totalInvestedThisMonth, totalCurrentValue, hasData } = useInvestments();
  const { summary, hasHoldings, pnlPercent } = useHoldings();
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  const usePortfolioData = hasHoldings && summary.totalValue > 0;

  const displayValue = usePortfolioData ? summary.totalValue : totalCurrentValue;
  const gain = usePortfolioData ? summary.totalPnl : totalCurrentValue - totalInvestedThisMonth;
  const gainPct = usePortfolioData
    ? (summary.totalCostBasis > 0 ? pnlPercent.toFixed(1) : null)
    : (totalInvestedThisMonth > 0 ? ((gain / totalInvestedThisMonth) * 100).toFixed(1) : null);
  const isPositive = gain >= 0;
  const hasAnyData = hasData || hasHoldings;

  return (
    <div
      className="bg-card rounded-xl px-[14px] py-3 md:px-5 md:py-[18px] flex flex-col h-full shadow-section overflow-hidden"
    >
      {/* Icon + label */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-[38px] h-[38px] rounded-[11px] bg-primary/10 flex items-center justify-center shrink-0">
          <TrendingUp className="w-[19px] h-[19px] text-primary" strokeWidth={2} />
        </div>
        <p className="text-[13px] font-semibold text-muted-foreground">
          {t('investments.title', 'Investments')}
        </p>
      </div>

      {hasAnyData ? (
        <>
          {/* Main value */}
          <p className="text-[28px] font-semibold tabular-nums tracking-tight text-foreground leading-tight">
            {formatCurrency(displayValue)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {t('investments.totalValue', 'Current portfolio value')}
          </p>

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-[11px] bg-muted/50 px-3 py-2">
              <p className="text-[11px] text-muted-foreground mb-0.5">
                {usePortfolioData
                  ? t('investments.costBasis', 'Cost basis')
                  : t('investments.investedThisMonth', 'Invested this month')}
              </p>
              <p className="text-[13px] font-semibold tabular-nums text-foreground">
                {formatCurrency(usePortfolioData ? summary.totalCostBasis : totalInvestedThisMonth)}
              </p>
            </div>
            {gainPct !== null && (
              <div className="flex-1 rounded-[11px] bg-muted/50 px-3 py-2">
                <p className="text-[11px] text-muted-foreground mb-0.5">{t('investments.return', 'Return')}</p>
                <p
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
                >
                  {isPositive ? '+' : ''}{gainPct}%
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-[28px] font-semibold text-foreground/30 leading-tight">—</p>
          <p className="text-[13px] text-muted-foreground mt-1">
            {t('investments.noInvestments', 'No investment data yet')}
          </p>
        </>
      )}

      <div className="mt-auto pt-4">
        <Link
          to="/investments"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:opacity-70 transition-opacity"
        >
          {t('investments.viewInvestments', 'View investments')}
          <ArrowRight className="w-[14px] h-[14px]" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}
