import { PiggyBank } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocalization } from "@/hooks/useLocalization";

interface SavingsRateGaugeCardProps {
  income: number;
  expenses: number;
  previousIncome?: number;
  previousExpenses?: number;
  delay?: number;
}

export function SavingsRateGaugeCard({
  income,
  expenses,
  delay = 0,
}: SavingsRateGaugeCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const saved = Math.max(0, income - expenses);

  return (
    <div
      className="rounded-[18px] bg-card border border-border p-[18px_18px_16px] shadow-bento"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-muted-foreground">
          {t("stats.savingsRate")}
        </span>
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] bg-primary/10 text-primary">
          <PiggyBank className="w-[17px] h-[17px]" strokeWidth={2.2} />
        </div>
      </div>

      {/* Rate value */}
      <div className="text-[25px] font-bold tracking-[-0.02em] tabular-nums leading-none text-foreground">
        {rate}%
      </div>

      {/* Saved amount subtext */}
      <div className="text-[12px] mt-[5px] text-muted-foreground">
        {formatCurrency(saved)} {t("stats.savedThisMonth")}
      </div>
    </div>
  );
}
