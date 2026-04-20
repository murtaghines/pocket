import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { SavingsRateGauge } from "./SavingsRateGauge";

interface SavingsRateGaugeCardProps {
  income: number;
  expenses: number;
  previousIncome?: number;
  previousExpenses?: number;
  delay?: number;
}

const computeRate = (inc: number, exp: number) =>
  inc > 0 ? Math.round(((inc - exp) / inc) * 100) : 0;

export function SavingsRateGaugeCard({
  income,
  expenses,
  previousIncome,
  previousExpenses,
  delay = 0,
}: SavingsRateGaugeCardProps) {
  const { t } = useTranslation("dashboard");

  const currentRate = computeRate(income, expenses);
  const hasPrevious =
    previousIncome !== undefined && previousExpenses !== undefined;
  const previousRate = hasPrevious
    ? computeRate(previousIncome as number, previousExpenses as number)
    : 0;

  const delta = currentRate - previousRate;

  const getRatingLabel = () => {
    if (currentRate <= 0) {
      return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
    }
    if (currentRate >= 30) {
      return t("stats.excellent", { defaultValue: "Excellent" });
    }
    if (currentRate >= 15) {
      return t("stats.good", { defaultValue: "Good" });
    }
    return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
  };

  return (
    <Card
      variant="bento"
      className="animate-slide-up relative flex h-[200px] flex-col overflow-hidden border border-border/70 bg-card text-foreground shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative flex h-full flex-col p-4 md:p-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {t("stats.savingsRate")}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {currentRate}
            </span>
            <span className="text-lg font-semibold text-muted-foreground/60 md:text-xl">
              %
            </span>
          </div>
          {hasPrevious && (
            <div className="flex flex-col items-start justify-center gap-0.5 text-[11px] leading-tight">
              <span className="text-muted-foreground">
                {t("stats.previousMonthShort", {
                  defaultValue: "prev: {{rate}}%",
                  rate: previousRate,
                })}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold ${
                  delta >= 0
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {delta >= 0 ? (
                  <ArrowUp className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  <ArrowDown className="h-3 w-3" strokeWidth={2.5} />
                )}
                {Math.abs(delta)} pp
              </span>
            </div>
          )}
        </div>

        <div className="relative mt-4 flex flex-1 flex-col justify-end overflow-hidden">
          <SavingsRateGauge
            currentRate={currentRate}
            previousRate={previousRate}
            hasPrevious={hasPrevious}
          />

          {!hasPrevious && (
            <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
              {getRatingLabel()}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
