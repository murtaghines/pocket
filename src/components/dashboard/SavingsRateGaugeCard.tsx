import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

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
  const previousRate =
    previousIncome !== undefined && previousExpenses !== undefined
      ? computeRate(previousIncome, previousExpenses)
      : 0;

  const clampedCurrent = Math.max(0, Math.min(100, currentRate));
  const clampedPrev = Math.max(0, Math.min(100, previousRate));
  const lower = Math.min(clampedCurrent, clampedPrev);
  const higher = Math.max(clampedCurrent, clampedPrev);
  const isImprovement = currentRate >= previousRate;
  const delta = currentRate - previousRate;

  const getRatingLabel = () => {
    if (currentRate <= 0) return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
    if (currentRate >= 30) return t("stats.excellent", { defaultValue: "Excellent" });
    if (currentRate >= 15) return t("stats.good", { defaultValue: "Good" });
    return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
  };

  const deltaLabel =
    previousIncome !== undefined && previousExpenses !== undefined
      ? delta >= 0
        ? t("stats.savingsImproved", {
            defaultValue: "Savings improved by +{{delta}}%",
            delta: Math.abs(delta),
          })
        : t("stats.savingsDecreased", {
            defaultValue: "Savings decreased by -{{delta}}%",
            delta: Math.abs(delta),
          })
      : getRatingLabel();

  // Semi-circular gauge geometry
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const arcLength = Math.PI * radius;

  // Angle helper: 0% -> 180° (left), 100% -> 0° (right)
  const angleFor = (pct: number) => 180 - (pct / 100) * 180;
  const pointAt = (pct: number) => {
    const rad = (angleFor(pct) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  };

  const lowerPoint = pointAt(lower);
  const higherPoint = pointAt(higher);

  // Dashes for: full track, "before" filled track (up to lower), "delta" colored track (lower -> higher)
  const dashTrack = arcLength;
  const dashBefore = (lower / 100) * arcLength;
  const dashDelta = ((higher - lower) / 100) * arcLength;
  const offsetDelta = dashBefore;

  // Color of the change segment
  const changeColor = isImprovement
    ? "hsl(var(--primary))"
    : "hsl(var(--destructive))";

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden border-0 bg-card text-foreground h-[260px] flex flex-col relative"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5 md:p-6 relative flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("stats.savingsRate")}
          </p>
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5 text-foreground" strokeWidth={2.5} />
          </div>
        </div>

        {/* Big value */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-bold tracking-tight font-display text-foreground">
            {currentRate}
          </span>
          <span className="text-xl md:text-2xl font-semibold text-muted-foreground/60">
            %
          </span>
        </div>

        {/* Gauge */}
        <div className="flex-1 flex items-end justify-center -mb-1">
          <svg
            viewBox="0 0 200 130"
            className="w-full h-auto max-h-[130px]"
            preserveAspectRatio="xMidYMax meet"
          >
            <defs>
              <pattern
                id="gauge-stripes-bg"
                patternUnits="userSpaceOnUse"
                width="5"
                height="5"
                patternTransform="rotate(45)"
              >
                <rect width="5" height="5" fill="hsl(var(--muted))" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="5"
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                />
              </pattern>
            </defs>

            {/* Full background striped track (remaining) */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="url(#gauge-stripes-bg)"
              strokeWidth="22"
              strokeLinecap="round"
            />

            {/* "Before" segment — solid darker fill from 0 up to the lower of the two rates */}
            {lower > 0 && (
              <path
                d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.35)"
                strokeWidth="22"
                strokeLinecap="round"
                strokeDasharray={`${dashBefore} ${dashTrack}`}
              />
            )}

            {/* Delta segment — colored, between previous and current */}
            {higher > lower && (
              <path
                d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
                fill="none"
                stroke={changeColor}
                strokeWidth="22"
                strokeLinecap="round"
                strokeDasharray={`${dashDelta} ${dashTrack}`}
                strokeDashoffset={-offsetDelta}
                style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
              />
            )}

            {/* Dark dot at the start of the colored change (= previous rate position) */}
            <circle
              cx={lowerPoint.x}
              cy={lowerPoint.y}
              r="9"
              fill="hsl(var(--foreground) / 0.85)"
            />
            <circle
              cx={lowerPoint.x}
              cy={lowerPoint.y}
              r="3.5"
              fill="hsl(var(--background))"
            />

            {/* Bright dot at the end of the colored change (= current rate position) */}
            {higher > lower && (
              <>
                <circle cx={higherPoint.x} cy={higherPoint.y} r="11" fill={changeColor} />
                <circle cx={higherPoint.x} cy={higherPoint.y} r="5.5" fill="#ffffff" />
                {/* Vertical needle dropping from current marker */}
                <line
                  x1={higherPoint.x}
                  y1={higherPoint.y + 11}
                  x2={higherPoint.x}
                  y2={cy + 14}
                  stroke={changeColor}
                  strokeWidth="1.5"
                />
              </>
            )}
          </svg>
        </div>

        {/* Caption */}
        <p className="text-sm text-muted-foreground text-center mt-1">
          {deltaLabel}
        </p>
      </div>
    </Card>
  );
}
