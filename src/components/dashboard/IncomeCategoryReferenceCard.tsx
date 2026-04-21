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
const TRACK_START_DEG = 205;
const TRACK_SWEEP_DEG = 220;
const LABEL_ANCHOR_DEG = ((TRACK_START_DEG - TRACK_SWEEP_DEG) % 360 + 360) % 360;
const OUTER_RADIUS = 150;
const INNER_RADIUS = 70;
const VISUAL_BOX_WIDTH = 420;
const VISUAL_BOX_HEIGHT = 220;
const VISUAL_CHART_SIZE = 220;
const VISUAL_CHART_LEFT = 88;
const RING_STYLES = ["white", "black", "striped", "soft", "softer"] as const;

type RingStyle = (typeof RING_STYLES)[number];

const polar = (cx: number, cy: number, radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy - radius * Math.sin(radians),
  };
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
        className="animate-slide-up h-[300px] w-full"
        style={{ animationDelay: "200ms" }}
      >
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-base font-semibold">
            {t("charts.incomeByCategory", "Income by Category")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <EmptyState height="h-[220px]" />
        </CardContent>
      </Card>
    );
  }

  const ringCount = sorted.length;
  const ringSpacing = ringCount > 1 ? (OUTER_RADIUS - INNER_RADIUS) / (ringCount - 1) : 0;
  const strokeWidth = ringCount > 1 ? Math.max(20, Math.min(32, ringSpacing * 0.9)) : 30;
  const cx = SVG_SIZE * 0.5;
  const cy = SVG_SIZE * 0.5;
  // Radii used to align legend rows with each ring on the right side
  const radiiByIndex = sorted.map((_, index) =>
    ringCount === 1 ? OUTER_RADIUS : OUTER_RADIUS - ringSpacing * index,
  );

  return (
    <Card
      variant="bento"
      className="animate-slide-up relative flex h-[300px] w-full overflow-hidden border-0 text-primary-foreground"
      style={{ animationDelay: "200ms", backgroundColor: "hsl(var(--primary))" }}
    >
      <CardHeader className="absolute left-0 top-0 z-10 p-5 pb-0">
        <CardTitle className="text-[15px] font-semibold text-primary-foreground md:text-base">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative flex h-full w-full items-center gap-3 p-5 pt-14">
        <div className="z-10 flex h-full w-[44%] flex-col justify-center pr-1">
          <div className="relative h-[200px] w-full">
            {sorted.map((category, index) => {
              const ringStyle = RING_STYLES[index % RING_STYLES.length];
              const pct = (category.value / total) * 100;
              // Map ring radius to vertical position (largest ring = top row)
              const radius = radiiByIndex[index];
              const topPct = ringCount === 1
                ? 50
                : ((OUTER_RADIUS - radius) / (OUTER_RADIUS - INNER_RADIUS)) * 100;

              return (
                <div
                  key={`${category.name}-legend-${index}`}
                  className="absolute left-0 right-0 flex items-center gap-2.5 text-primary-foreground"
                  style={{ top: `${topPct}%`, transform: "translateY(-50%)" }}
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-primary-foreground/80"
                    style={{
                      backgroundColor:
                        ringStyle === "white"
                          ? "hsl(var(--primary-foreground))"
                          : ringStyle === "black"
                            ? "hsl(var(--sidebar-background))"
                            : "transparent",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium md:text-sm">
                    {category.name}
                  </span>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums md:text-sm">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="pointer-events-none relative h-full flex-1">
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
              const radius = radiiByIndex[index];
              const pct = category.value / total;
              const ringStyle = RING_STYLES[index % RING_STYLES.length];
              const circumference = 2 * Math.PI * radius;
              const trackLength = (TRACK_SWEEP_DEG / 360) * circumference;
              const fillLength = Math.max(trackLength * pct, pct > 0 ? strokeWidth * 0.9 : 0);

              return (
                <g key={`${category.name}-${index}`} transform={`rotate(${TRACK_START_DEG} ${cx} ${cy})`}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke="hsl(var(--primary-foreground) / 0.15)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${trackLength} ${circumference}`}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={getRingStroke(ringStyle)}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={`${fillLength} ${circumference}`}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}