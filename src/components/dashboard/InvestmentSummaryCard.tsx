import { useInvestments } from "@/hooks/useInvestments";
import { useLocalization } from "@/hooks/useLocalization";
import { TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function InvestmentSummaryCard() {
  const { totalInvestedThisMonth, totalCurrentValue, hasData } = useInvestments();
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();

  const gain = totalCurrentValue - totalInvestedThisMonth;
  const gainPct = totalInvestedThisMonth > 0
    ? ((gain / totalInvestedThisMonth) * 100).toFixed(1)
    : null;
  const isPositive = gain >= 0;

  return (
    <div
      className="bg-card rounded-xl p-[20px_22px_18px] flex flex-col h-full border border-border shadow-section"
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

      {hasData ? (
        <>
          {/* Main value */}
          <p className="text-[28px] font-semibold tabular-nums tracking-tight text-foreground leading-tight">
            {formatCurrency(totalCurrentValue)}
          </p>
          <p className="text-[12px] text-muted-foreground mt-1">
            {t('investments.totalValue', 'Current portfolio value')}
          </p>

          {/* Stats row */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 rounded-[11px] bg-muted/50 px-3 py-2">
              <p className="text-[11px] text-muted-foreground mb-0.5">{t('investments.investedThisMonth', 'Invested this month')}</p>
              <p className="text-[13px] font-semibold tabular-nums text-foreground">{formatCurrency(totalInvestedThisMonth)}</p>
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
