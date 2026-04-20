import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryChartProps {
  data: CategoryData[];
}

export function CategoryChart({ data }: CategoryChartProps) {
  const { t } = useTranslation('dashboard');
  const { formatCurrency } = useLocalization();
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const hasData = data.length > 0 && total > 0;

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: '200ms' }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t('charts.incomeByCategory', 'Income by Category')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  // Sort descending by value
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const topCategory = sorted[0];
  const topPercentage = (topCategory.value / total) * 100;
  // Remaining categories rendered as concentric arcs (max 6 to keep readable)
  const restCategories = sorted.slice(1, 7);

  // Arc geometry — concentric semicircles
  const cx = 150;
  const cy = 150;
  const baseRadius = 38;
  const ringGap = 14;
  const strokeWidth = 11;

  // Build a half-circle arc path from angle 180° (left) sweeping clockwise to 0° (right)
  // pct: 0..1 represents the portion of the semicircle filled
  const buildArc = (radius: number, pct: number) => {
    const clamped = Math.max(0, Math.min(1, pct));
    if (clamped <= 0) return '';
    const startX = cx - radius;
    const startY = cy;
    const endAngle = Math.PI - Math.PI * clamped; // radians
    const endX = cx + radius * Math.cos(endAngle);
    const endY = cy - radius * Math.sin(endAngle);
    const largeArc = clamped > 0.5 ? 1 : 0;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
  };

  const buildBackgroundArc = (radius: number) => {
    const startX = cx - radius;
    const startY = cy;
    const endX = cx + radius;
    const endY = cy;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 1 1 ${endX} ${endY}`;
  };

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden border-0 text-white"
      style={{ animationDelay: '200ms', backgroundColor: 'hsl(var(--primary))' }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-white">
          {t('charts.incomeByCategory', 'Income by Category')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col">
          {/* Featured (top) category */}
          <div className="mb-2">
            <div className="text-xs uppercase tracking-wide text-white/60">
              {topCategory.name}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-4xl font-bold leading-none">
                {Math.round(topPercentage)}
                <span className="text-2xl font-medium text-white/70">%</span>
              </span>
              <span className="text-sm text-white/70">
                · {formatCurrency(topCategory.value)}
              </span>
            </div>
          </div>

          {/* Concentric arcs */}
          <div className="relative w-full flex justify-center">
            <svg
              viewBox="0 0 300 170"
              className="w-full max-w-[320px] h-auto"
              aria-hidden
            >
              {restCategories.map((cat, i) => {
                const radius = baseRadius + i * ringGap;
                const pct = cat.value / total;
                const isWhite = i === 0;
                const isStriped = i === 1;
                const stripeId = `stripes-${i}`;
                const arcColor = isWhite
                  ? '#ffffff'
                  : isStriped
                  ? `url(#${stripeId})`
                  : `rgba(255,255,255,${Math.max(0.18, 0.55 - i * 0.08)})`;
                return (
                  <g key={i}>
                    {isStriped && (
                      <defs>
                        <pattern
                          id={stripeId}
                          patternUnits="userSpaceOnUse"
                          width="6"
                          height="6"
                          patternTransform="rotate(45)"
                        >
                          <rect width="6" height="6" fill="rgba(255,255,255,0.15)" />
                          <rect width="3" height="6" fill="#ffffff" />
                        </pattern>
                      </defs>
                    )}
                    {/* Background track */}
                    <path
                      d={buildBackgroundArc(radius)}
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                    />
                    {/* Filled arc */}
                    {pct > 0 && (
                      <path
                        d={buildArc(radius, pct)}
                        fill="none"
                        stroke={arcColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend for the arcs */}
          <div className="mt-3 space-y-1.5">
            {restCategories.map((cat, i) => {
              const pct = (cat.value / total) * 100;
              return (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-sm text-white/85"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="h-px w-6 bg-white/30 flex-shrink-0" />
                    <span className="truncate">{cat.name}</span>
                  </div>
                  <span className="text-white/70 text-xs tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
