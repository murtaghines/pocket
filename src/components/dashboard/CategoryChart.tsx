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
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: "200ms" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            {t("charts.incomeByCategory", "Income by Category")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[280px]" />
        </CardContent>
      </Card>
    );
  }

  // Sort categories from largest to smallest income.
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const topCategory = sorted[0];
  const topPercentage = (topCategory.value / total) * 100;

  // Legend mirrors the reference (3 entries). If fewer categories exist we still
  // render whatever we have.
  const legendCategories = sorted.slice(0, 3);

  // Reference image has 5 concentric rings. Order from OUTSIDE to INSIDE:
  //   white  ->  black  ->  striped  ->  light blue  ->  lighter blue
  // We anchor the visual sequence to the largest category being innermost
  // (the striped one in the reference is in the middle); to faithfully copy
  // the artwork we always render the same 5 visual layers regardless of the
  // number of categories.
  const RING_STYLES = [
    "soft", // outermost — very translucent white
    "light", // translucent white
    "striped", // diagonal stripes
    "dark", // black
    "white", // innermost — solid white
  ] as const;

  // SVG geometry — fixed-pixel square so it never gets squashed by the card.
  // Center is OUTSIDE the right edge so the arcs cup the card from the right.
  const SIZE = 360;
  const cx = SIZE * 0.78; // center pushed toward (and past) the right edge
  const cy = SIZE / 2;
  const innerRadius = 34;
  const ringGap = 22;
  const strokeWidth = 20;

  // Arc spans 220°: from top-left, sweeping clockwise across the top,
  // around the right, and down to the bottom-left — opening to the LEFT.
  const SWEEP_DEG = 220;
  const startAngleDeg = -90 - SWEEP_DEG / 2; // symmetric around straight-up
  const endAngleDeg = startAngleDeg + SWEEP_DEG;

  const polar = (radius: number, angleDeg: number) => {
    const a = (angleDeg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };

  const buildArc = (radius: number) => {
    const start = polar(radius, startAngleDeg);
    const end = polar(radius, endAngleDeg);
    const largeArc = SWEEP_DEG > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden border-0 text-white relative min-h-[340px]"
      style={{ animationDelay: "200ms", backgroundColor: "hsl(var(--primary))" }}
    >
      {/* Concentric arcs — fixed-size SVG, vertically centered, anchored to right */}
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: SIZE, height: SIZE }}
        aria-hidden
      >
        <defs>
          <pattern
            id="cat-stripes"
            patternUnits="userSpaceOnUse"
            width="8"
            height="8"
            patternTransform="rotate(60)"
          >
            <rect width="8" height="8" fill="hsl(var(--primary))" />
            <rect width="3.6" height="8" fill="#ffffff" />
          </pattern>
        </defs>

        {RING_STYLES.map((style, i) => {
          // i = 0 is outermost (largest radius), i = 4 is innermost.
          const radius = innerRadius + (RING_STYLES.length - 1 - i) * ringGap;
          let stroke = "#ffffff";
          let opacity = 1;
          if (style === "soft") opacity = 0.28;
          else if (style === "light") opacity = 0.55;
          else if (style === "striped") stroke = "url(#cat-stripes)";
          else if (style === "dark") stroke = "#0b1220";
          // "white" stays solid white at full opacity
          return (
            <path
              key={i}
              d={buildArc(radius)}
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
        <CardTitle className="text-base font-semibold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col h-full pt-2">
        {/* Big featured number — largest income category */}
        <div>
          <div className="flex items-start gap-1">
            <span className="text-6xl md:text-7xl font-light leading-none tracking-tight">
              {Math.round(topPercentage)}
            </span>
            <span className="text-2xl md:text-3xl font-light text-white/85 leading-none mt-2">
              %
            </span>
          </div>
          <div className="mt-3 text-sm text-white/85">
            {topCategory.name} · {formatCurrency(topCategory.value)}
          </div>
        </div>

        {/* Legend — bottom left, with connector line + open circle, like reference */}
        <div className="mt-auto pt-10 space-y-3 max-w-[58%]">
          {legendCategories.map((cat) => {
            const pct = (cat.value / total) * 100;
            return (
              <div
                key={cat.name}
                className="flex items-center gap-3 text-[15px] text-white"
              >
                <span className="font-medium whitespace-nowrap">{cat.name}</span>
                <span className="flex-1 h-px bg-white/55 min-w-[40px]" />
                <span className="h-2.5 w-2.5 rounded-full border border-white/80 flex-shrink-0" />
                <span className="text-xs text-white/80 tabular-nums w-10 text-right">
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