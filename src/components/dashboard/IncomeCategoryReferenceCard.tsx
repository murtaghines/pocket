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
// Fixed on-screen chart size — never grows with the number of categories.
const CHART_SIZE = 188;
const RING_STYLES = ["white", "black", "striped", "soft", "softer"] as const;

type RingStyle = (typeof RING_STYLES)[number];

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

/** Colour for the legend dot, matching each ring's style. */
const getDotBackground = (style: RingStyle) => {
  if (style === "white") return "hsl(var(--primary-foreground))";
  if (style === "black") return "hsl(var(--sidebar-background))";
  return "transparent";
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
      <Card variant="bento" className="h-[300px] w-full">
        <CardHeader className="p-4 pb-1">
          <CardTitle className="text-[15px] font-semibold text-foreground">
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
  const strokeWidth = ringCount === 1 ? 30 : Math.max(12, Math.min(28, ringSpacing * 0.78));
  const cx = SVG_SIZE * 0.5;
  const cy = SVG_SIZE * 0.5;
  const radiiByIndex = sorted.map((_, index) =>
    ringCount === 1 ? OUTER_RADIUS : OUTER_RADIUS - ringSpacing * index,
  );

  return (
    <Card
      variant="bento"
      className="relative flex h-[300px] w-full flex-col overflow-hidden border-0 bg-primary text-primary-foreground"
    >
      <CardHeader className="shrink-0 p-5 pb-0">
        <CardTitle className="text-[15px] font-semibold text-primary-foreground">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 items-center gap-4 p-5 pt-3">
        {/* Legend — left, single column, scrolls vertically when there are many categories */}
        <ul className="flex max-h-full min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
          {sorted.map((category, index) => {
            const pct = (category.value / total) * 100;
            const ringStyle = RING_STYLES[index % RING_STYLES.length];
            return (
              <li
                key={`${category.name}-legend-${index}`}
                className="flex items-center gap-2.5 text-primary-foreground"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-primary-foreground/80"
                  style={{ backgroundColor: getDotBackground(ringStyle) }}
                />
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{category.name}</span>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums">{pct.toFixed(0)}%</span>
              </li>
            );
          })}
        </ul>

        {/* Chart — right, fixed size so it never grows with the category count */}
        <div className="shrink-0" style={{ width: CHART_SIZE, height: CHART_SIZE }}>
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
