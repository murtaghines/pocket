import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";
import type { CurrencyExposure } from "@/hooks/usePortfolioHighlights";

const CURRENCY_COLORS: Record<string, string> = {
  USD: "hsl(216, 85%, 52%)",
  EUR: "hsl(240, 55%, 55%)",
  ARS: "hsl(170, 60%, 42%)",
  GBP: "hsl(350, 60%, 50%)",
  BRL: "hsl(130, 50%, 40%)",
};

function getCurrencyColor(currency: string, index: number): string {
  return (
    CURRENCY_COLORS[currency] ??
    `hsl(${(index * 67 + 200) % 360}, 55%, 50%)`
  );
}

interface CurrencyExposureCardProps {
  exposure: CurrencyExposure[];
  yieldOnCost: number;
  yieldOnCurrent: number;
}

export function CurrencyExposureCard({
  exposure,
  yieldOnCost,
  yieldOnCurrent,
}: CurrencyExposureCardProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency } = useLocalization();

  if (exposure.length <= 1) return null;

  return (
    <div className="rounded-xl p-5 bg-card border border-border shadow-section min-w-0 flex flex-col">
      <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-muted-foreground mb-4">
        {t("highlights.currencyExposure")}
      </p>

      <div className="space-y-3 flex-1">
        {exposure.map((exp, i) => (
          <div key={exp.currency}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground font-mono">
                {exp.currency}
              </span>
              <span className="font-medium tabular-nums">
                {exp.pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  backgroundColor: getCurrencyColor(exp.currency, i),
                  width: `${exp.pct}%`,
                }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
              {formatCurrency(exp.value, exp.currency)}
            </p>
          </div>
        ))}
      </div>

      {(yieldOnCost > 0 || yieldOnCurrent > 0) && (
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {t("highlights.yieldOnCurrent")}
            </span>
            <span className="font-medium tabular-nums">
              {yieldOnCurrent > 0
                ? `${yieldOnCurrent.toFixed(2)}%`
                : "—"}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">
              {t("highlights.yieldOnCost")}
            </span>
            <span className="font-medium tabular-nums">
              {yieldOnCost > 0 ? `${yieldOnCost.toFixed(2)}%` : "—"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
