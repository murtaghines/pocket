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

  // Sort descending by value (largest income category first)
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const topCategory = sorted[0];
  const topPercentage = (topCategory.value / total) * 100;
  // Up to 5 categories total displayed as concentric rings (innermost = largest)
  const ringCategories = sorted.slice(0, 5);
  // Legend shows up to 3 categories (matching the reference image)
  const legendCategories = sorted.slice(0, 3);

  // SVG geometry — concentric arcs opening to the bottom-left (like the reference)
  // Center is placed toward the bottom-right so arcs sweep up-and-left.
  const VB_W = 360;
  const VB_H = 320;
  const cx = 235;
  const cy = 235;
  const baseRadius = 55;
  const ringGap = 26;
  const strokeWidth = 22;

  // Arc spans 180° going from straight up (-90°) clockwise around to straight down (90°),
  // passing through the right side — i.e. the arc opens toward the LEFT.
  // We render the full half-circle for every visible ring; differences between
  // categories are conveyed via stroke style (solid white, striped, translucent).
  const buildHalfArc = (radius: number) => {
    const startX = cx;
    const startY = cy - radius; // top
    const endX = cx;
    const endY = cy + radius; // bottom
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  };

  // Visual style per ring index (0 = innermost = largest category)
  const ringStyle = (i: number, total: number) => {
    if (i === 0) return { type: 'striped' as const };
    if (i === 1) return { type: 'dark' as const };
    if (i === 2) return { type: 'solid' as const };
    // Outer rings fade out
    const opacity = Math.max(0.18, 0.45 - (i - 3) * 0.12);
    return { type: 'translucent' as const, opacity };
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
