import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface IncomeCategoryReferenceCardProps {
  data: CategoryData[];
}

const SVG_SIZE = 360;
// Polar angles: 0° = right, 90° = up, 180° = left, 270° = down.
// Arcs open toward the LEFT: start at top (90°), sweep COUNTER-clockwise
// through the right side down to the bottom (-90° == 270°). The moving "end"
// of each arc travels from the top toward the bottom on the LEFT side,
// finishing pointing at the legend.
const START_DEG = 90;
const SWEEP_DEG = 270;
const OUTER_RADIUS = 150;
const INNER_RADIUS = 50;
const RING_STYLES = ["white", "black", "striped", "soft", "softer"] as const;

type RingStyle = (typeof RING_STYLES)[number];

const polar = (cx: number, cy: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians),
  };
};

const buildArcPath = (
  cx: number,
  cy: number,
  radius: number,
  endDegrees: number,
) => {
  const start = polar(cx, cy, radius, START_DEG);
  const end = polar(cx, cy, radius, endDegrees);
  // We sweep from START_DEG decreasing toward (START_DEG - SWEEP_DEG).
  // In math angles that's clockwise; with SVG's y-down screen, that is sweep-flag = 0.
  const sweepDelta = Math.abs(START_DEG - endDegrees);
  const largeArcFlag = sweepDelta > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
};

const getRingStroke = (style: RingStyle) => {
  switch (style) {
    case "white":
      return "hsl(var(--primary-foreground))";
    case "black":
      return "hsl(var(--sidebar-background))";
    case "striped":
      return "url(#income-category-stripes)";
    case "soft":
      return "hsl(var(--primary-foreground) / 0.34)";
    case "softer":
      return "hsl(var(--primary-foreground) / 0.22)";
  }
};

export function IncomeCategoryReferenceCard({ data }: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");

  const sorted = [...data]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  const hasData = sorted.length > 0 && total > 0;

  if (!hasData) {
    return (
      <Card
        variant="bento"
        className="animate-slide-up aspect-square w-full max-w-[420px] justify-self-start"
        style={{ animationDelay: "200ms" }}
      >
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-base font-semibold">
            {t("charts.incomeByCategory", "Income by Category")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <EmptyState height="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  const ringCount = sorted.length;
  const ringSpacing = ringCount > 1 ? (OUTER_RADIUS - INNER_RADIUS) / (ringCount - 1) : 0;
  const strokeWidth = ringCount > 1 ? Math.max(16, Math.min(32, ringSpacing * 0.78)) : 30;
  // Center pushed to the right so the arcs (opening left) fill the card nicely.
  const cx = SVG_SIZE * 0.62;
  const cy = SVG_SIZE * 0.5;

  return (
    <Card
      variant="bento"
      className="animate-slide-up relative flex aspect-square w-full max-w-[420px] justify-self-end overflow-hidden border-0 text-primary-foreground"
      style={{ animationDelay: "200ms", backgroundColor: "hsl(var(--primary))" }}
    >
      <CardHeader className="relative z-10 p-5 pb-0">
        <CardTitle className="text-[15px] font-semibold text-primary-foreground md:text-base">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative flex-1 p-0">
        <div className="pointer-events-none absolute inset-0">
          <svg
            viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
            preserveAspectRatio="xMidYMid meet"
            className="h-full w-full"
            aria-hidden
          >
            <defs>
              <pattern
                id="income-category-stripes"
                width="12"
                height="12"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(10)"
              >
                <rect width="12" height="12" fill="transparent" />
                <rect width="4" height="12" fill="hsl(var(--primary-foreground))" />
              </pattern>
            </defs>

            {sorted.map((category, index) => {
              const radius = ringCount === 1 ? OUTER_RADIUS : OUTER_RADIUS - ringSpacing * index;
              const pct = category.value / total;
              const endDeg = START_DEG - SWEEP_DEG * pct;
              const ringStyle = RING_STYLES[index % RING_STYLES.length];

              return (
                <g key={`${category.name}-${index}`}>
                  <path
                    d={buildArcPath(cx, cy, radius, START_DEG - SWEEP_DEG)}
                    fill="none"
                    stroke="hsl(var(--primary-foreground) / 0.15)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <path
                    d={buildArcPath(cx, cy, radius, endDeg)}
                    fill="none"
                    stroke={getRingStroke(ringStyle)}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>
        </div>

        <div className="absolute inset-x-5 bottom-5 z-10 max-w-[55%] space-y-1.5">
          {sorted.map((category, index) => {
            const pct = (category.value / total) * 100;

            return (
              <div
                key={`${category.name}-legend-${index}`}
                className="flex items-center justify-between gap-3 text-primary-foreground"
              >
                <span className="truncate text-[13px] font-medium md:text-sm">{category.name}</span>
                <span className="text-[13px] font-medium tabular-nums text-primary-foreground/85 md:text-sm">
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