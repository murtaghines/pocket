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
      <div className="w-full h-full rounded-xl bg-[#5191FF] p-[20px_22px_20px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
        <p className="text-[15px] font-heading font-bold text-white mb-[6px]">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
        <EmptyState height="h-[220px]" />
      </div>
    );
  }

  const ringFills: Array<{ stroke: string; dotFill: string; dotStroke: string }> = [
    { stroke: "#fff", dotFill: "#fff", dotStroke: "#fff" },
    { stroke: "#0C0D0E", dotFill: "#0C0D0E", dotStroke: "#fff" },
    { stroke: "url(#inc-stripes)", dotFill: "url(#inc-stripes)", dotStroke: "#fff" },
  ];

  const endAngle = TRACK_START_DEG + TRACK_SWEEP_DEG;

  const legendItems = sorted.map((cat, i) => {
    const pct = Math.round((cat.value / total) * 100);
    const r = RADII[i] ?? RADII[RADII.length - 1];
    const marker = pointOnCircle(CX, CY, r, endAngle);
    return { cat, pct, marker, ringIndex: i };
  });

  legendItems.sort((a, b) => a.marker.y - b.marker.y);

  const LEGEND_X = 16;
  const LEGEND_START_Y = 147.3;
  const LEGEND_GAP = 29.9;

  return (
    <div className="w-full h-full rounded-xl bg-[#5191FF] p-[20px_22px_20px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
      <p className="text-[15px] font-heading font-bold text-white mb-[6px]">
        {t("charts.incomeByCategory", "Income by Category")}
      </p>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full flex-1"
        style={{ minHeight: 230, display: "block" }}
        aria-hidden
      >
        <defs>
          <pattern
            id="inc-stripes"
            width="12"
            height="12"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(10)"
          >
            <rect width="12" height="12" fill="transparent" />
            <rect width="4" height="12" fill="#fff" />
          </pattern>
        </defs>

        {sorted.map((category, index) => {
          const radius = RADII[index] ?? RADII[RADII.length - 1];
          const pct = category.value / total;
          const circumference = 2 * Math.PI * radius;
          const trackLength = (TRACK_SWEEP_DEG / 360) * circumference;
          const fillLength = Math.max(trackLength * pct, pct > 0 ? STROKE_WIDTH * 0.9 : 0);
          const fill = ringFills[index] ?? ringFills[ringFills.length - 1];

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
                stroke={fill.stroke}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                strokeDasharray={`${fillLength} ${circumference}`}
              />
            </g>
          );
        })}

        {legendItems.map(({ cat, pct, marker, ringIndex }, rowIdx) => {
          const fill = ringFills[ringIndex] ?? ringFills[ringFills.length - 1];
          const legendY = LEGEND_START_Y + rowIdx * LEGEND_GAP;
          const lineEndX = marker.x - 8;
          const lineStartX = 122;

          return (
            <g key={`legend-${ringIndex}`}>
              <text
                x={LEGEND_X}
                y={legendY}
                style={{ font: "500 13.5px Inter, sans-serif", fill: "#fff" }}
              >
                {cat.name}
              </text>
              <line
                x1={lineStartX}
                y1={legendY - 4.5}
                x2={lineEndX}
                y2={legendY - 4.5}
                stroke="rgba(255,255,255,0.65)"
                strokeWidth={1.2}
                strokeDasharray="3 4"
              />
              <circle
                cx={marker.x}
                cy={marker.y}
                r={4.5}
                fill={fill.dotFill}
                stroke={fill.dotStroke}
                strokeWidth={1.4}
              />
              <text
                x={marker.x + 13}
                y={legendY}
                style={{
                  font: "600 13.5px Inter, sans-serif",
                  fill: "#fff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {pct}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
