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
  const hasPrevious =
    previousIncome !== undefined && previousExpenses !== undefined;
  const previousRate = hasPrevious
    ? computeRate(previousIncome!, previousExpenses!)
    : 0;

  const clampedCurrent = Math.max(0, Math.min(100, currentRate));
  const clampedPrev = Math.max(0, Math.min(100, previousRate));
  const lower = Math.min(clampedCurrent, clampedPrev);
  const higher = Math.max(clampedCurrent, clampedPrev);
  const delta = currentRate - previousRate;

  const getRatingLabel = () => {
    if (currentRate <= 0)
      return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
    if (currentRate >= 30)
      return t("stats.excellent", { defaultValue: "Excellent" });
    if (currentRate >= 15)
      return t("stats.good", { defaultValue: "Good" });
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

  // Geometry — large arc, then we crop the SVG viewBox to "zoom in" on the top.
  const radius = 140;
  const cx = 160;
  const cy = 170;
  const arcLength = Math.PI * radius;

  const angleFor = (pct: number) => 180 - (pct / 100) * 180;
  const pointAt = (pct: number) => {
    const rad = (angleFor(pct) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy - radius * Math.sin(rad) };
  };

  const lowerPoint = pointAt(lower);
  const higherPoint = pointAt(higher);

  // Dash math
  const dashLower = (lower / 100) * arcLength;
  const dashDelta = ((higher - lower) / 100) * arcLength;

  const arcPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden bg-card text-foreground h-[260px] flex flex-col relative border border-border/60 shadow-sm"
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
        {hasPrevious && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("stats.previousMonthShort", {
              defaultValue: "Previous: {{rate}}%",
              rate: previousRate,
            })}
          </p>
        )}

        {/* Gauge area — zoomed crop of the top of the arc */}
        <div className="flex-1 flex items-end justify-center overflow-hidden">
          {/* viewBox crops the top portion only — gives the "zoomed in" look */}
          <svg
            viewBox="20 25 280 110"
            className="w-full h-auto"
            preserveAspectRatio="xMidYMax meet"
          >
            <defs>
              {/* Thin radial-looking stripes for the empty track */}
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
                  stroke="hsl(var(--muted-foreground) / 0.45)"
                  strokeWidth="1.2"
                />
              </pattern>
            </defs>

            {/* Empty track — thin striped lines */}
            <path
              d={arcPath}
              fill="none"
              stroke="url(#gauge-stripes-bg)"
              strokeWidth="32"
              strokeLinecap="butt"
            />

            {/* Previous-month fill — dark gray solid */}
            {lower > 0 && (
              <path
                d={arcPath}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.55)"
                strokeWidth="32"
                strokeLinecap="round"
                strokeDasharray={`${dashLower} ${arcLength}`}
              />
            )}

            {/* Delta fill — brand blue, between previous and current */}
            {higher > lower && (
              <path
                d={arcPath}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="32"
                strokeLinecap="round"
                strokeDasharray={`${dashDelta} ${arcLength}`}
                strokeDashoffset={-dashLower}
                style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
              />
            )}

            {/* Marker for the previous rate — dark donut */}
            {hasPrevious && (
              <>
                <circle
                  cx={lowerPoint.x}
                  cy={lowerPoint.y}
                  r="14"
                  fill="hsl(var(--muted-foreground) / 0.85)"
                />
                <circle
                  cx={lowerPoint.x}
                  cy={lowerPoint.y}
                  r="6"
                  fill="hsl(var(--card))"
                />
              </>
            )}

            {/* Marker for current rate — blue donut with white center + needle */}
            {higher > lower && (
              <>
                <line
                  x1={higherPoint.x}
                  y1={higherPoint.y + 14}
                  x2={higherPoint.x}
                  y2={cy + 6}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                <circle
                  cx={higherPoint.x}
                  cy={higherPoint.y}
                  r="16"
                  fill="hsl(var(--primary))"
                />
                <circle
                  cx={higherPoint.x}
                  cy={higherPoint.y}
                  r="7"
                  fill="#ffffff"
                />
              </>
            )}

            {/* If no previous data, show only the current marker on the empty track */}
            {!hasPrevious && clampedCurrent > 0 && (
              <>
                <circle
                  cx={pointAt(clampedCurrent).x}
                  cy={pointAt(clampedCurrent).y}
                  r="16"
                  fill="hsl(var(--primary))"
                />
                <circle
                  cx={pointAt(clampedCurrent).x}
                  cy={pointAt(clampedCurrent).y}
                  r="7"
                  fill="#ffffff"
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
