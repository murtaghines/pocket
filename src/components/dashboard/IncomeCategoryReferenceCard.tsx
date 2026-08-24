import { useMemo } from "react";
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
const CX = 300;
const CY = 112;
const TRACK_START_DEG = 205;
const TRACK_SWEEP_DEG = 220;

const MAX_RADIUS = 100;
const MIN_RADIUS = 22;
const MAX_STROKE = 13;
const MIN_STROKE = 8;

const RING_FILLS = [
  { stroke: "#fff", dotFill: "#fff", dotStroke: "#fff" },
  { stroke: "#0C0D0E", dotFill: "#0C0D0E", dotStroke: "#fff" },
  { stroke: "url(#inc-stripes)", dotFill: "url(#inc-stripes)", dotStroke: "#fff" },
  { stroke: "rgba(255,255,255,0.55)", dotFill: "rgba(255,255,255,0.55)", dotStroke: "#fff" },
  { stroke: "#fff", dotFill: "#fff", dotStroke: "#0C0D0E" },
  { stroke: "#0C0D0E", dotFill: "#0C0D0E", dotStroke: "#fff" },
  { stroke: "url(#inc-stripes)", dotFill: "url(#inc-stripes)", dotStroke: "#fff" },
  { stroke: "rgba(255,255,255,0.55)", dotFill: "rgba(255,255,255,0.55)", dotStroke: "#fff" },
];

function computeRadii(count: number): number[] {
  if (count <= 1) return [MAX_RADIUS];
  const step = (MAX_RADIUS - MIN_RADIUS) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(MAX_RADIUS - i * step));
}

export function IncomeCategoryReferenceCard({ data }: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");

  const sorted = useMemo(
    () => [...data].filter((item) => item.value > 0).sort((a, b) => b.value - a.value),
    [data],
  );

  const total = sorted.reduce((sum, item) => sum + item.value, 0);
  const hasData = sorted.length > 0 && total > 0;

  const radii = useMemo(() => computeRadii(sorted.length), [sorted.length]);
  const strokeWidth = sorted.length <= 3 ? MAX_STROKE : Math.max(MIN_STROKE, Math.round(MAX_STROKE - (sorted.length - 3) * 1.2));

  const legendGap = sorted.length <= 3 ? 29.9 : Math.max(20, 29.9 - (sorted.length - 3) * 2.5);
  const legendStartY = sorted.length <= 1 ? 162 : sorted.length <= 3 ? 147 : 140;
  const lastLegendY = legendStartY + (sorted.length - 1) * legendGap;
  const vbH = Math.max(CY + MAX_RADIUS + 14, lastLegendY + 20);

  if (!hasData) {
    return (
      <div className="w-full rounded-xl bg-[#5191FF] p-[20px_22px_20px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
        <p className="text-[15px] font-heading font-bold text-white mb-[6px]">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
        <EmptyState height="h-[200px]" />
      </div>
    );
  }

  const legendItems = sorted.map((cat, i) => {
    const pct = Math.round((cat.value / total) * 100);
    return { cat, pct, ringIndex: i, r: radii[i] };
  });
  legendItems.sort((a, b) => b.ringIndex - a.ringIndex);

  return (
    <div className="w-full rounded-xl bg-[#5191FF] p-[20px_22px_20px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
      <p className="text-[15px] font-heading font-bold text-white mb-[6px]">
        {t("charts.incomeByCategory", "Income by Category")}
      </p>
      <svg
        viewBox={`0 0 ${VB_W} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full flex-1"
        style={{ display: "block" }}
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
          const radius = radii[index];
          const pct = category.value / total;
          const circumference = 2 * Math.PI * radius;
          const trackLength = (TRACK_SWEEP_DEG / 360) * circumference;
          const fillLength = Math.max(trackLength * pct, pct > 0 ? strokeWidth * 0.9 : 0);
          const fill = RING_FILLS[index % RING_FILLS.length];

          return (
            <g key={index} transform={`rotate(${TRACK_START_DEG} ${CX} ${CY})`}>
              <circle
                cx={CX}
                cy={CY}
                r={radius}
                fill="none"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${trackLength} ${circumference}`}
              />
              <circle
                cx={CX}
                cy={CY}
                r={radius}
                fill="none"
                stroke={fill.stroke}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${fillLength} ${circumference}`}
              />
            </g>
          );
        })}

        {legendItems.map(({ cat, pct, ringIndex }, rowIdx) => {
          const fill = RING_FILLS[ringIndex % RING_FILLS.length];
          const legendTextY = legendStartY + rowIdx * legendGap;
          const legendLineY = legendTextY - 4.5;
          const r = radii[ringIndex];

          const dy = legendLineY - CY;
          const d2 = r * r - dy * dy;
          let markerX: number;
          if (d2 > 0) {
            markerX = CX + Math.sqrt(d2);
          } else {
            markerX = CX + r * 0.85;
          }

          const lineStartX = 122;
          const lineEndX = markerX - 8.5;

          return (
            <g key={`legend-${ringIndex}`}>
              <text
                x={16}
                y={legendTextY}
                style={{ font: "500 13.5px Inter, sans-serif", fill: "#fff" }}
              >
                {cat.name}
              </text>
              {lineEndX > lineStartX && (
                <line
                  x1={lineStartX}
                  y1={legendLineY}
                  x2={lineEndX}
                  y2={legendLineY}
                  stroke="rgba(255,255,255,0.65)"
                  strokeWidth={1.2}
                  strokeDasharray="3 4"
                />
              )}
              <circle
                cx={markerX}
                cy={legendLineY}
                r={4.5}
                fill={fill.dotFill}
                stroke={fill.dotStroke}
                strokeWidth={1.4}
              />
              <text
                x={markerX + 13}
                y={legendTextY}
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
