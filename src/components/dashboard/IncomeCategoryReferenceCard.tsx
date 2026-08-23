import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/empty-state";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface IncomeCategoryReferenceCardProps {
  data: CategoryData[];
}

const VB_W = 420;
const VB_H = 238;
const CX = 300;
const CY = 112;
const TRACK_START_DEG = 205;
const TRACK_SWEEP_DEG = 220;
const STROKE_WIDTH = 13;
const RADII = [100, 67, 34];
const RING_STYLES = ["white", "black", "striped", "soft", "softer"] as const;

type RingStyle = (typeof RING_STYLES)[number];

const getRingStroke = (style: RingStyle) => {
  switch (style) {
    case "white": return "rgba(255,255,255,1)";
    case "black": return "#080808";
    case "striped": return "url(#income-category-stripes)";
    case "soft": return "rgba(255,255,255,0.34)";
    case "softer": return "rgba(255,255,255,0.22)";
  }
};

const getDotFill = (style: RingStyle) => {
  if (style === "white") return "#fff";
  if (style === "black") return "#080808";
  if (style === "striped") return "rgba(255,255,255,0.7)";
  if (style === "soft") return "rgba(255,255,255,0.34)";
  return "rgba(255,255,255,0.22)";
};

function degToRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function pointOnCircle(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = degToRad(angleDeg - 90);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function IncomeCategoryReferenceCard({ data }: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");

  const filtered = [...data]
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const totalAll = filtered.reduce((sum, item) => sum + item.value, 0);
  const hasData = filtered.length > 0 && totalAll > 0;

  const MAX_RINGS = RADII.length;
  let sorted = filtered;
  if (filtered.length > MAX_RINGS) {
    const head = filtered.slice(0, MAX_RINGS - 1);
    const tail = filtered.slice(MAX_RINGS - 1);
    const tailValue = tail.reduce((sum, item) => sum + item.value, 0);
    sorted = [
      ...head,
      { name: t("charts.otherCategories", "Other"), value: tailValue, color: tail[0]?.color ?? "" },
    ];
  }
  const total = sorted.reduce((sum, item) => sum + item.value, 0);

  if (!hasData) {
    return (
      <div className="h-[300px] w-full rounded-xl bg-[#5191FF] p-5 shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)]">
        <p className="text-[15px] font-heading font-semibold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
        <EmptyState height="h-[220px]" />
      </div>
    );
  }

  const endAngle = TRACK_START_DEG + TRACK_SWEEP_DEG;
  const markerPoints = sorted.map((_, i) => {
    const r = RADII[i] ?? RADII[RADII.length - 1];
    return pointOnCircle(CX, CY, r, endAngle);
  });

  const sortedByMarkerY = sorted.map((cat, i) => ({ cat, i, markerY: markerPoints[i].y }))
    .sort((a, b) => a.markerY - b.markerY);

  const LEGEND_X = 14;
  const LEGEND_START_Y = 140;
  const LEGEND_LINE_H = 22;

  return (
    <div className="relative flex h-[300px] w-full flex-col overflow-hidden rounded-xl bg-[#5191FF] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)]">
      <div className="shrink-0 px-5 pt-5 pb-0">
        <p className="text-[15px] font-heading font-semibold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
      </div>

      <div className="flex-1 min-h-0 px-2 pb-2">
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
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
              <rect width="4" height="12" fill="rgba(255,255,255,1)" />
            </pattern>
          </defs>

          {sorted.map((category, index) => {
            const radius = RADII[index] ?? RADII[RADII.length - 1];
            const pct = category.value / total;
            const ringStyle = RING_STYLES[index % RING_STYLES.length];
            const circumference = 2 * Math.PI * radius;
            const trackLength = (TRACK_SWEEP_DEG / 360) * circumference;
            const fillLength = Math.max(trackLength * pct, pct > 0 ? STROKE_WIDTH * 0.9 : 0);

            return (
              <g key={index} transform={`rotate(${TRACK_START_DEG} ${CX} ${CY})`}>
                <circle
                  cx={CX}
                  cy={CY}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${trackLength} ${circumference}`}
                />
                <circle
                  cx={CX}
                  cy={CY}
                  r={radius}
                  fill="none"
                  stroke={getRingStroke(ringStyle)}
                  strokeWidth={STROKE_WIDTH}
                  strokeLinecap="round"
                  strokeDasharray={`${fillLength} ${circumference}`}
                />
              </g>
            );
          })}

          {sortedByMarkerY.map(({ cat, i }, rowIdx) => {
            const ringStyle = RING_STYLES[i % RING_STYLES.length];
            const marker = markerPoints[i];
            const legendY = LEGEND_START_Y + rowIdx * LEGEND_LINE_H;
            const pct = Math.round((cat.value / total) * 100);

            return (
              <g key={`connector-${i}`}>
                <line
                  x1={LEGEND_X + 110}
                  y1={legendY}
                  x2={marker.x - 8}
                  y2={marker.y}
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth={1}
                  strokeDasharray="3 4"
                />
                <circle
                  cx={marker.x}
                  cy={marker.y}
                  r={4.5}
                  fill={getDotFill(ringStyle)}
                  stroke="white"
                  strokeWidth={1.4}
                />
                <text
                  x={LEGEND_X}
                  y={legendY + 1}
                  fill="white"
                  fontSize="13.5"
                  fontWeight="500"
                  fontFamily="Inter, sans-serif"
                  dominantBaseline="middle"
                >
                  {cat.name}
                </text>
                <text
                  x={LEGEND_X + 118}
                  y={legendY + 1}
                  fill="white"
                  fontSize="13.5"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                  dominantBaseline="middle"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {pct}%
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
