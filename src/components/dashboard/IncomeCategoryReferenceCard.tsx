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
const START_DEG = 210;
const SWEEP_DEG = 240;
const OUTER_RADIUS = 150;
const INNER_RADIUS = 60;
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
  const largeArcFlag = Math.abs(START_DEG - endDegrees) > 180 ? 1 : 0;

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
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
  const { formatCurrency } = useLocalization();

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

  const topCategory = sorted[0];
  const topPercentage = (topCategory.value / total) * 100;
  const ringCount = sorted.length;
  const ringSpacing = ringCount > 1 ? (OUTER_RADIUS - INNER_RADIUS) / (ringCount - 1) : 0;
  const strokeWidth = ringCount > 1 ? Math.max(10, Math.min(28, ringSpacing * 0.74)) : 28;
  const cx = SVG_SIZE * 0.68;
  const cy = SVG_SIZE * 0.64;

  return (
    <Card
      variant="bento"
      className="animate-slide-up relative flex aspect-square w-full max-w-[420px] justify-self-start overflow-hidden border-0 text-primary-foreground"
      style={{ animationDelay: "200ms", backgroundColor: "hsl(var(--primary))" }}
    >
      <CardHeader className="relative z-10 p-4 pb-0">
        <CardTitle className="text-[15px] font-medium text-primary-foreground md:text-base">
          {t("charts.incomeByCategory", "Income by Category")}
        </CardTitle>
      </CardHeader>

      <CardContent className="relative flex-1 p-4 pt-1">
        <div className="relative z-10 max-w-[34%] pt-3">
          <div className="flex items-start gap-1 leading-none">
            <span className="text-[4.4rem] font-light tracking-normal md:text-[5rem]">
              {Math.round(topPercentage)}
            </span>
            <span className="pt-2 text-xl font-light text-primary-foreground/80 md:text-2xl">%</span>
          </div>

          <div className="mt-2 space-y-1 text-primary-foreground/84">
            <p className="truncate text-[13px] font-medium md:text-sm">{topCategory.name}</p>
            <p className="text-xs md:text-[13px]">{formatCurrency(topCategory.value)}</p>
          </div>
        </div>

        <div className="pointer-events-none absolute right-[-7%] top-[11%] h-[66%] w-[82%]">
          <svg viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`} className="h-full w-full" aria-hidden>
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

        <div className="absolute inset-x-4 bottom-4 z-10 space-y-2">
          {sorted.map((category, index) => {
            const pct = (category.value / total) * 100;

            return (
              <div key={`${category.name}-legend-${index}`} className="flex items-center gap-2.5 text-primary-foreground">
                <span className="max-w-[34%] truncate text-[12px] font-medium md:text-[13px]">{category.name}</span>
                <span className="h-px flex-1 bg-primary-foreground/22" />
                <span className="h-2.5 w-2.5 rounded-full border border-primary-foreground/80 bg-transparent" />
                <span className="w-9 text-right text-[11px] text-primary-foreground/82 md:text-xs">
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