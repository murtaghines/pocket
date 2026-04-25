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
const OUTER_RADIUS = 150;
const INNER_RADIUS = 56;
const VISUAL_BOX_WIDTH = 460;
const VISUAL_BOX_HEIGHT = 220;
const VISUAL_CHART_SIZE = 220;
const VISUAL_CHART_LEFT = 8;
const LABEL_COLUMN_LEFT = VISUAL_CHART_LEFT + VISUAL_CHART_SIZE + 24;
const LABEL_COLUMN_WIDTH = VISUAL_BOX_WIDTH - LABEL_COLUMN_LEFT;
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

  const filtered = [...data]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalAll = filtered.reduce((sum, item) => sum + item.value, 0);
  const hasData = filtered.length > 0 && totalAll > 0;

  // Cap visible rings at 6: collapse the long tail into a single "Other" ring
  // so the chart never gets visually cluttered with too many concentric rings.
  const MAX_RINGS = 6;
  let sorted = filtered;
  if (filtered.length > MAX_RINGS) {
    const head = filtered.slice(0, MAX_RINGS - 1);
    const tail = filtered.slice(MAX_RINGS - 1);
    const tailValue = tail.reduce((sum, item) => sum + item.value, 0);
    sorted = [
      ...head,
      {
        name: t("charts.otherCategories", "Other"),
        value: tailValue,
        color: tail[0]?.color ?? "",
      },
    ];
  }
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  if (!hasData) {
    return (
      <Card
        variant="bento"
        className="h-[300px] w-full"

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
  // Scale stroke width down as we add rings so they never overlap.
  // 1 ring -> 30, 2 -> 28, 3 -> 24, 4 -> 20, 5 -> 17, 6 -> 14
  const strokeWidth =
    ringCount === 1
      ? 30
      : Math.max(12, Math.min(28, ringSpacing * 0.78));
  const cx = SVG_SIZE * 0.5;
  const cy = SVG_SIZE * 0.5;
  const radiiByIndex = sorted.map((_, index) =>
    ringCount === 1 ? OUTER_RADIUS : OUTER_RADIUS - ringSpacing * index,
  );
  const chartCenterX = VISUAL_CHART_LEFT + VISUAL_CHART_SIZE / 2;
  const chartCenterY = VISUAL_BOX_HEIGHT / 2;

  // Two-column legend when there are many categories so labels never collide
  // and stay legible at any count. <=4 -> single column, >4 -> two columns.
  const useTwoColumns = ringCount > 4;
  const columnCount = useTwoColumns ? 2 : 1;
  const rowsPerColumn = Math.ceil(ringCount / columnCount);
  const lineHeight = useTwoColumns ? 22 : ringCount >= 4 ? 24 : 26;
  const columnGap = 12;
  const columnWidth = useTwoColumns
    ? (LABEL_COLUMN_WIDTH - columnGap) / 2
    : LABEL_COLUMN_WIDTH;
  const labelTextSize = useTwoColumns ? "text-[11px] md:text-xs" : "text-[13px] md:text-sm";
  const labelValueSize = useTwoColumns ? "text-[11px] md:text-xs" : "text-[13px] md:text-sm";
  const dotSize = useTwoColumns ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <Card
      variant="bento"
      className="relative flex h-[300px] w-full overflow-hidden border-0 bg-primary text-primary-foreground"

    >
      <CardHeader className="absolute left-0 top-0 z-10 p-5 pb-0">
        <CardTitle className="text-[15px] font-semibold text-primary-foreground md:text-base">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative flex h-full w-full items-center justify-center p-5 pt-14">
        <div
          className="relative h-[220px] w-full"
          style={{ maxWidth: `${VISUAL_BOX_WIDTH}px` }}
        >
          <div
            className="pointer-events-none absolute top-1/2"
            style={{
              left: `${VISUAL_CHART_LEFT}px`,
              width: `${VISUAL_CHART_SIZE}px`,
              height: `${VISUAL_CHART_SIZE}px`,
              transform: "translateY(-50%)",
            }}
          >
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

          <div className="absolute inset-0 z-10">
            {sorted.map((category, index) => {
              const pct = (category.value / total) * 100;
              const ringStyle = RING_STYLES[index % RING_STYLES.length];
              const colIndex = Math.floor(index / rowsPerColumn);
              const rowIndex = index % rowsPerColumn;
              const itemsInThisColumn =
                colIndex === columnCount - 1 ? ringCount - colIndex * rowsPerColumn : rowsPerColumn;
              const totalHeight = (itemsInThisColumn - 1) * lineHeight;
              const startY = chartCenterY - totalHeight / 2;
              const topY = startY + rowIndex * lineHeight;
              const leftX = LABEL_COLUMN_LEFT + colIndex * (columnWidth + columnGap);

              return (
                <div
                  key={`${category.name}-legend-${index}`}
                  className="absolute flex items-center gap-2 text-primary-foreground"
                  style={{
                    left: `${leftX}px`,
                    width: `${columnWidth}px`,
                    top: `${topY}px`,
                    transform: "translateY(-50%)",
                  }}
                >
                  <span
                    className={`${dotSize} shrink-0 rounded-full border border-primary-foreground/80`}
                    style={{
                      backgroundColor:
                        ringStyle === "white"
                          ? "hsl(var(--primary-foreground))"
                          : ringStyle === "black"
                            ? "hsl(var(--sidebar-background))"
                            : "transparent",
                    }}
                  />
                  <span className={`${labelTextSize} min-w-0 flex-1 truncate font-medium`}>
                    {category.name}
                  </span>
                  <span className={`${labelValueSize} shrink-0 font-semibold tabular-nums`}>
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
