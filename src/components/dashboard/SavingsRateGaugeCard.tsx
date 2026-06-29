import { PiggyBank } from "lucide-react";
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
  const { formatCurrency } = useLocalization();

  const rate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const saved = Math.max(0, income - expenses);

  return (
    <div
      className="rounded-[18px] bg-card border border-[rgba(13,30,70,.07)] p-[18px_18px_16px]"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)", animationDelay: `${delay}ms` }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-[14px]">
        <span className="text-[12px] font-semibold uppercase tracking-[.04em] text-[#79839a]">
          Savings rate
        </span>
        <div className="flex items-center justify-center w-[30px] h-[30px] rounded-[9px] bg-[hsl(216_100%_95%)] text-[hsl(216_100%_50%)]">
          <PiggyBank className="w-[17px] h-[17px]" strokeWidth={2.2} />
        </div>
      </div>

      {/* Rate value */}
      <div className="text-[25px] font-bold tracking-[-0.02em] tabular-nums leading-none text-[#0d1220]">
        {rate}%
      </div>

      {/* Saved amount subtext */}
      <div className="text-[12px] mt-[5px] text-[#79839a]">
        {formatCurrency(saved)} saved this month
      </div>
    </div>
  );
}
