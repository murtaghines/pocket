import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";

interface SavingsRateGaugeCardProps {
  income: number;
  expenses: number;
  delay?: number;
}

export function SavingsRateGaugeCard({
  income,
  expenses,
  delay = 0,
}: SavingsRateGaugeCardProps) {
  const { t } = useTranslation("dashboard");
  const savingsRate =
    income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const clamped = Math.max(0, Math.min(100, savingsRate));

  const getRatingLabel = () => {
    if (savingsRate <= 0) return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
    if (savingsRate >= 30) return t("stats.excellent", { defaultValue: "Excellent" });
    if (savingsRate >= 15) return t("stats.good", { defaultValue: "Good" });
    return t("stats.needsImprovement", { defaultValue: "Needs improvement" });
  };

  // Semi-circular gauge geometry (180° arc)
  // SVG viewBox: 200 wide x 110 tall, arc center at (100, 100), radius 80
  const radius = 80;
  const cx = 100;
  const cy = 100;
  const arcLength = Math.PI * radius; // half circle
  const dashOffset = arcLength - (clamped / 100) * arcLength;

  // Position the indicator dot at the end of progress arc
  const angleDeg = 180 - (clamped / 100) * 180; // 180° (left) -> 0° (right)
  const angleRad = (angleDeg * Math.PI) / 180;
  const dotX = cx + radius * Math.cos(angleRad);
  const dotY = cy - radius * Math.sin(angleRad);

  // Start dot (always at left end)
  const startX = cx - radius;
  const startY = cy;

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
            <ArrowUpRight
              className="w-5 h-5 text-foreground"
              strokeWidth={2.5}
            />
          </div>
        </div>

        {/* Big value */}
        <div className="flex items-baseline gap-1">
          <span className="text-3xl md:text-4xl font-bold tracking-tight font-display text-foreground">
            {savingsRate}
          </span>
          <span className="text-xl md:text-2xl font-semibold text-muted-foreground/60">
            %
          </span>
        </div>

        {/* Gauge */}
        <div className="flex-1 flex items-end justify-center -mb-2">
          <svg
            viewBox="0 0 200 120"
            className="w-full h-auto max-h-[120px]"
            preserveAspectRatio="xMidYMax meet"
          >
            <defs>
              <pattern
                id="gauge-stripes"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <rect width="6" height="6" fill="hsl(var(--muted))" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="6"
                  stroke="hsl(var(--background))"
                  strokeWidth="2"
                />
              </pattern>
            </defs>

            {/* Background striped track */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="url(#gauge-stripes)"
              strokeWidth="22"
              strokeLinecap="round"
            />

            {/* Progress arc (primary blue) */}
            <path
              d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="22"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={dashOffset}
              style={{
                transition: "stroke-dashoffset 1.2s ease-out",
              }}
            />

            {/* Start cap dot (darker pill) */}
            <circle
              cx={startX}
              cy={startY}
              r="7"
              fill="hsl(var(--background))"
              stroke="hsl(var(--muted-foreground) / 0.3)"
              strokeWidth="1"
            />

            {/* Indicator dot at end of progress */}
            {clamped > 0 && (
              <>
                <circle
                  cx={dotX}
                  cy={dotY}
                  r="11"
                  fill="hsl(var(--primary))"
                />
                <circle cx={dotX} cy={dotY} r="6" fill="#ffffff" />
              </>
            )}

            {/* Vertical needle drop from indicator */}
            {clamped > 0 && (
              <line
                x1={dotX}
                y1={dotY + 11}
                x2={dotX}
                y2={cy + 12}
                stroke="hsl(var(--primary))"
                strokeWidth="1.5"
              />
            )}
          </svg>
        </div>

        {/* Rating label */}
        <p className="text-sm text-muted-foreground text-center mt-1">
          {getRatingLabel()}
        </p>
      </div>
    </Card>
  );
}
