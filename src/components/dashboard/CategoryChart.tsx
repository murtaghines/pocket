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

/**
 * Income by Category — replicates the "Portfolio Health" reference card:
 *  - Square card with primary-blue background.
 *  - One semicircular ring per category, ordered LARGEST (outer) → SMALLEST (inner).
 *  - Each ring shows a faint background track + a foreground arc filled to the
 *    category's percentage of total income.
 *  - Visual styles cycle: white / black / striped / light-blue / lighter-blue.
 *  - Legend at the bottom: name — line — open circle — %.
 */
export function CategoryChart({ data }: CategoryChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up aspect-square" style={{ animationDelay: "200ms" }}>
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

  // Sort largest → smallest and cap at 5 rings (matches the reference visually).
  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, 5);
  const topCategory = sorted[0];
  const topPercentage = (topCategory.value / total) * 100;

  // Visual style per ring index (0 = OUTERMOST = largest category).
  // Cycles: white → black → striped → light-blue → lighter-blue
  type RingStyle = "white" | "black" | "striped" | "lightBlue" | "lighterBlue";
  const STYLE_CYCLE: RingStyle[] = ["white", "black", "striped", "lightBlue", "lighterBlue"];

  // SVG geometry — square viewbox. Semicircles open downward.
  const SIZE = 400;
  const cx = SIZE / 2;
  const cy = SIZE * 0.62; // pivot slightly below center so the semicircles read well
  const outerRadius = SIZE * 0.42;
  const ringGap = 26;
  const strokeWidth = 22;

  // Build a top-half semicircle path of given radius (sweeps from left to right
  // along the top), and a partial fill arc from the left up to `pct` of the way.
  const fullArc = (radius: number) => {
    const startX = cx - radius;
    const startY = cy;
    const endX = cx + radius;
    const endY = cy;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`;
  };
  const fillArc = (radius: number, pct: number) => {
    const clamped = Math.max(0, Math.min(1, pct));
    if (clamped <= 0) return "";
    const startX = cx - radius;
    const startY = cy;
    // angle measured clockwise from the left endpoint. 0 = left, π = right.
    const angle = Math.PI - Math.PI * clamped; // remaining angle from +x axis
    const endX = cx + radius * Math.cos(angle);
    const endY = cy - radius * Math.sin(angle);
    const largeArc = clamped > 0.5 ? 1 : 0;
    return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`;
  };

  return (
    <Card
      variant="bento"
      className="animate-slide-up overflow-hidden border-0 text-white relative aspect-square"
      style={{ animationDelay: "200ms", backgroundColor: "hsl(var(--primary))" }}
    >
      <CardHeader className="pb-0 relative z-10">
        <CardTitle className="text-base font-semibold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-col h-full pt-2 pb-4">
        {/* Featured number — largest income category */}
        <div>
          <div className="flex items-start gap-1">
            <span className="text-6xl md:text-7xl font-light leading-none tracking-tight">
              {Math.round(topPercentage)}
            </span>
            <span className="text-2xl md:text-3xl font-light text-white/85 leading-none mt-2">
              %
            </span>
          </div>
          <div className="mt-2 text-sm text-white/85">
            {topCategory.name} · {formatCurrency(topCategory.value)}
          </div>
        </div>

        {/* Concentric semicircles — fills card horizontally, sits below header */}
        <div className="absolute inset-x-0 top-[42%] flex justify-center pointer-events-none">
          <svg
            viewBox={`0 0 ${SIZE} ${SIZE * 0.7}`}
            className="w-[88%] h-auto"
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

            {sorted.map((cat, i) => {
              // i = 0 outermost → largest. Shrink inward.
              const radius = outerRadius - i * ringGap;
              if (radius <= 0) return null;
              const pct = cat.value / total;
              const style = STYLE_CYCLE[i % STYLE_CYCLE.length];

              let stroke = "#ffffff";
              let opacity = 1;
              if (style === "white") stroke = "#ffffff";
              else if (style === "black") stroke = "#0b1220";
              else if (style === "striped") stroke = "url(#cat-stripes)";
              else if (style === "lightBlue") {
                stroke = "#ffffff";
                opacity = 0.55;
              } else if (style === "lighterBlue") {
                stroke = "#ffffff";
                opacity = 0.3;
              }

              return (
                <g key={cat.name}>
                  {/* Background track (faint) */}
                  <path
                    d={fullArc(radius)}
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity={0.12}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  {/* Filled portion */}
                  {pct > 0 && (
                    <path
                      d={fillArc(radius, pct)}
                      fill="none"
                      stroke={stroke}
                      strokeOpacity={opacity}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                    />
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend pinned to the bottom — one row per category */}
        <div className="mt-auto space-y-2.5 relative z-10">
          {sorted.map((cat) => {
            const pct = (cat.value / total) * 100;
            return (
              <div
                key={cat.name}
                className="flex items-center gap-3 text-[15px] text-white"
              >
                <span className="font-medium whitespace-nowrap">{cat.name}</span>
                <span className="flex-1 h-px bg-white/55 min-w-[40px]" />
                <span className="h-2.5 w-2.5 rounded-full border border-white/80 flex-shrink-0" />
                <span className="text-xs text-white/85 tabular-nums w-10 text-right">
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