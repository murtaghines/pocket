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
      className="animate-slide-up overflow-hidden border-0 text-white relative"
      style={{ animationDelay: '200ms', backgroundColor: 'hsl(var(--primary))' }}
    >
      {/* Concentric arcs absolutely positioned on the right side */}
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMaxYMid meet"
        className="absolute inset-y-0 right-0 h-full w-auto pointer-events-none"
        aria-hidden
      >
        <defs>
          <pattern
            id="cat-stripes"
            patternUnits="userSpaceOnUse"
            width="7"
            height="7"
            patternTransform="rotate(60)"
          >
            <rect width="7" height="7" fill="hsl(var(--primary))" />
            <rect width="3.2" height="7" fill="#ffffff" />
          </pattern>
        </defs>
        {ringCategories.map((_, i) => {
          const radius = baseRadius + i * ringGap;
          const style = ringStyle(i, ringCategories.length);
          let stroke = '';
          let opacity = 1;
          if (style.type === 'striped') stroke = 'url(#cat-stripes)';
          else if (style.type === 'dark') stroke = '#0b1220';
          else if (style.type === 'solid') stroke = '#ffffff';
          else {
            stroke = '#ffffff';
            opacity = style.opacity;
          }
          return (
            <path
              key={i}
              d={buildHalfArc(radius)}
              fill="none"
              stroke={stroke}
              strokeOpacity={opacity}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      <CardHeader className="pb-0 relative z-10">
        <CardTitle className="text-lg font-semibold text-white">
          {t('charts.incomeByCategory', 'Income by Category')}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col h-full">
        {/* Big featured number — largest income category */}
        <div className="mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-6xl md:text-7xl font-light leading-none tracking-tight">
              {Math.round(topPercentage)}
              <span className="text-3xl md:text-4xl font-light text-white/80">%</span>
            </span>
          </div>
          <div className="mt-2 text-sm text-white/80">
            {topCategory.name} · {formatCurrency(topCategory.value)}
          </div>
        </div>

        {/* Legend with connector lines, anchored to the bottom-left */}
        <div className="mt-auto pt-10 space-y-3">
          {legendCategories.map((cat) => {
            const pct = (cat.value / total) * 100;
            return (
              <div
                key={cat.name}
                className="flex items-center gap-2 text-sm text-white/90"
              >
                <span className="font-medium">{cat.name}</span>
                <span className="flex-1 h-px bg-white/40 min-w-[24px] max-w-[140px]" />
                <span className="h-2.5 w-2.5 rounded-full border border-white/70" />
                <span className="text-xs text-white/70 tabular-nums w-10 text-right">
                  {pct.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
