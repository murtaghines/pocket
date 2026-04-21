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
const TRACK_START_DEG = 152;
const TRACK_END_DEG = -138;
const TRACK_SWEEP_DEG = TRACK_START_DEG - TRACK_END_DEG;
const OUTER_RADIUS = 120;
const INNER_RADIUS = 54;
const RING_STYLES = ["white", "black", "striped", "soft", "softer"] as const;

type RingStyle = (typeof RING_STYLES)[number];

const polar = (cx: number, cy: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians),
  };
};

const buildArcPath = (cx: number, cy: number, radius: number, startDegrees: number, endDegrees: number) => {
  const start = polar(cx, cy, radius, startDegrees);
  const end = polar(cx, cy, radius, endDegrees);
  const sweepDelta = Math.abs(startDegrees - endDegrees);
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
  const strokeWidth = ringCount > 1 ? Math.max(14, Math.min(24, ringSpacing * 1.02)) : 22;
  const cx = SVG_SIZE * 0.72;
  const cy = SVG_SIZE * 0.43;
  const legendStartY = 286;
  const legendGap = 24;
  const labelX = 38;
  const percentageX = 124;
  const dotX = 194;

  return (
    <Card
      variant="bento"
      className="animate-slide-up relative flex aspect-square w-full max-w-[380px] justify-self-end overflow-hidden border-0 text-primary-foreground"
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
              const fillStartDeg = TRACK_END_DEG + TRACK_SWEEP_DEG * pct;
              const ringStyle = RING_STYLES[index % RING_STYLES.length];
              const legendY = legendStartY + index * legendGap;
              const ringEnd = polar(cx, cy, radius, TRACK_END_DEG);

              return (
                <g key={`${category.name}-${index}`}>
                  <path
                    d={buildArcPath(cx, cy, radius, TRACK_START_DEG, TRACK_END_DEG)}
                    fill="none"
                    stroke="hsl(var(--primary-foreground) / 0.15)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />
                  <path
                    d={buildArcPath(cx, cy, radius, fillStartDeg, TRACK_END_DEG)}
                    fill="none"
                    stroke={getRingStroke(ringStyle)}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                  />

                  <path
                    d={`M ${percentageX + 18} ${legendY} H ${dotX - 9} Q ${dotX + 6} ${legendY} ${ringEnd.x - 10} ${ringEnd.y}`}
                    fill="none"
                    stroke="hsl(var(--primary-foreground) / 0.28)"
                    strokeWidth="1.35"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={dotX}
                    cy={legendY}
                    r="4.75"
                    fill="hsl(var(--primary))"
                    stroke="hsl(var(--primary-foreground) / 0.9)"
                    strokeWidth="1.35"
                  />
                </g>
              );
            })}

            {sorted.map((category, index) => {
              const pct = (category.value / total) * 100;
              const legendY = legendStartY + index * legendGap;

              return (
                <g key={`${category.name}-label-${index}`}>
                  <text
                    x={labelX}
                    y={legendY + 4}
                    fill="hsl(var(--primary-foreground))"
                    fontSize="13"
                    fontWeight="500"
                  >
                    {category.name}
                  </text>
                  <text
                    x={percentageX}
                    y={legendY + 4}
                    fill="hsl(var(--primary-foreground) / 0.88)"
                    fontSize="13"
                    fontWeight="500"
                  >
                    {pct.toFixed(0)}%
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}