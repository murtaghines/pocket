import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ArrowUpRight, ArrowDown, ArrowUp } from "lucide-react";

interface SavingsRateGaugeCardProps {
  income: number;
  expenses: number;
  previousIncome?: number;
  previousExpenses?: number;
  delay?: number;
}

const clampRate = (value: number) => Math.max(0, Math.min(100, value));
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

  const currentClamped = clampRate(currentRate);
  const previousClamped = clampRate(previousRate);
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

  const deltaActionLabel = hasPrevious
    ? delta >= 0
      ? t("stats.savingsIncreased", { defaultValue: "Savings increased" })
      : t("stats.savingsDecreased", { defaultValue: "Savings decreased" })
    : null;

  const deltaAmountLabel = hasPrevious
    ? t("stats.byNPp", {
        defaultValue: "by {{delta}} pp",
        delta: Math.abs(delta),
      })
    : null;

  const radius = 148;
  const cx = 160;
  const cy = 176;
  const arcLength = Math.PI * radius;
  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  const angleFor = (pct: number) => 180 - (pct / 100) * 180;
  const pointAt = (pct: number) => {
    const rad = (angleFor(pct) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  };

  const previousPoint = pointAt(previousClamped);
  const currentPoint = pointAt(currentClamped);
  const deltaStart = Math.min(previousClamped, currentClamped);
  const deltaEnd = Math.max(previousClamped, currentClamped);
  const previousDash = (previousClamped / 100) * arcLength;
  const currentDash = (currentClamped / 100) * arcLength;
  const deltaDash = ((deltaEnd - deltaStart) / 100) * arcLength;
  const deltaOffset = -((deltaStart / 100) * arcLength);

  return (
    <Card
      variant="bento"
      className="animate-slide-up relative flex h-[200px] flex-col overflow-hidden border border-border/70 bg-card text-foreground shadow-sm"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative flex h-full flex-col p-4 md:p-5">
        <div className="mb-2 flex items-start justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("stats.savingsRate")}
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <ArrowUpRight className="h-4 w-4 text-foreground" strokeWidth={2.5} />
          </div>
        </div>

        <div className="flex items-baseline gap-1">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {currentRate}
          </span>
          <span className="text-lg font-semibold text-muted-foreground/60 md:text-xl">
            %
          </span>
        </div>

        {hasPrevious && (
          <div className="mt-0.5 flex items-center gap-2 text-[11px]">
            <span className="text-muted-foreground">
              {t("stats.previousMonthShort", {
                defaultValue: "Previous: {{rate}}%",
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

        <div className="relative mt-1 flex flex-1 flex-col justify-end overflow-hidden">
          <div className="mx-[-14%] w-[128%] overflow-hidden">
            <svg
              viewBox="0 0 320 196"
              className="block h-[110px] w-full"
              preserveAspectRatio="xMidYMax meet"
            >
              <defs>
                <pattern
                  id="gauge-stripes-bg"
                  patternUnits="userSpaceOnUse"
                  width="6"
                  height="6"
                  patternTransform="rotate(45)"
                >
                  <line
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="6"
                    stroke="hsl(var(--muted-foreground) / 0.42)"
                    strokeWidth="1.2"
                  />
                </pattern>
              </defs>

              <path
                d={arcPath}
                fill="none"
                stroke="url(#gauge-stripes-bg)"
                strokeWidth="38"
                strokeLinecap="round"
              />

              {hasPrevious && previousClamped > 0 && (
                <path
                  d={arcPath}
                  fill="none"
                  stroke="hsl(var(--muted-foreground) / 0.56)"
                  strokeWidth="38"
                  strokeLinecap="round"
                  strokeDasharray={`${previousDash} ${arcLength}`}
                />
              )}

              {!hasPrevious && currentClamped > 0 && (
                <path
                  d={arcPath}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="38"
                  strokeLinecap="round"
                  strokeDasharray={`${currentDash} ${arcLength}`}
                />
              )}

              {hasPrevious && deltaDash > 0 && (
                <path
                  d={arcPath}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="38"
                  strokeLinecap="round"
                  strokeDasharray={`${deltaDash} ${arcLength}`}
                  strokeDashoffset={deltaOffset}
                />
              )}

              {hasPrevious && (
                <>
                  <circle
                    cx={previousPoint.x}
                    cy={previousPoint.y}
                    r="18"
                    fill="hsl(var(--muted-foreground) / 0.88)"
                  />
                  <circle
                    cx={previousPoint.x}
                    cy={previousPoint.y}
                    r="8.5"
                    fill="hsl(var(--card))"
                  />
                </>
              )}

              {(currentClamped > 0 || !hasPrevious) && (
                <>
                  <line
                    x1={currentPoint.x}
                    y1={currentPoint.y + 18}
                    x2={currentPoint.x}
                    y2={cy + 16}
                    stroke="hsl(var(--primary) / 0.25)"
                    strokeWidth="2"
                  />
                  <circle
                    cx={currentPoint.x}
                    cy={currentPoint.y}
                    r="25"
                    fill="hsl(var(--primary) / 0.16)"
                  />
                  <circle
                    cx={currentPoint.x}
                    cy={currentPoint.y}
                    r="18"
                    fill="hsl(var(--primary))"
                  />
                  <circle
                    cx={currentPoint.x}
                    cy={currentPoint.y}
                    r="8"
                    fill="hsl(var(--card))"
                  />
                </>
              )}
            </svg>
          </div>

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
