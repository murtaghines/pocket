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

const VB_W = 500;
const RING_CX = 340;
const RING_CY = 150;
const ARC_START = 150;
const ARC_SWEEP = 240;
const R_MAX = 135;
const R_MIN = 28;

export function IncomeCategoryReferenceCard({ data }: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");

  const sorted = useMemo(
    () => [...data].filter((item) => item.value > 0).sort((a, b) => b.value - a.value),
    [data],
  );
  const total = sorted.reduce((s, c) => s + c.value, 0);
  const hasData = sorted.length > 0 && total > 0;

  const n = sorted.length;
  const sw = n <= 3 ? 14 : Math.max(9, Math.round(14 - (n - 3) * 1.2));

  const radii = useMemo(() => {
    if (n <= 1) return [R_MAX];
    return Array.from({ length: n }, (_, i) => Math.round(R_MAX - i * (R_MAX - R_MIN) / (n - 1)));
  }, [n]);

  const legendGap = n <= 4 ? 36 : Math.max(28, Math.round(36 - (n - 4) * 1.5));
  const legendY0 = RING_CY + R_MAX + 55;

  const legend = useMemo(() => {
    return [...sorted].reverse().map((cat, i) => {
      const origIdx = n - 1 - i;
      const pct = (cat.value / total) * 100;
      const label = pct < 1 && pct > 0
        ? pct.toFixed(1).replace(".", ",") + "%"
        : Math.round(pct) + "%";
      return { cat, label, r: radii[origIdx] };
    });
  }, [sorted, total, n, radii]);

  const vbH = legendY0 + (n - 1) * legendGap + 30;

  if (!hasData) {
    return (
      <div className="w-full h-full rounded-xl bg-[#5191FF] p-[20px_22px_20px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
        <p className="text-[15px] font-heading font-bold text-white mb-[6px]">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
        <EmptyState height="h-[200px]" />
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl bg-[#5191FF] p-[20px_22px_20px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
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
        {sorted.map((category, index) => {
          const r = radii[index];
          const pct = category.value / total;
          const c = 2 * Math.PI * r;
          const track = (ARC_SWEEP / 360) * c;
          const fill = Math.max(track * pct, pct > 0 ? sw * 0.8 : 0);
          return (
            <g key={index} transform={`rotate(${ARC_START} ${RING_CX} ${RING_CY})`}>
              <circle
                cx={RING_CX} cy={RING_CY} r={r}
                fill="none" stroke="rgba(255,255,255,0.12)"
                strokeWidth={sw} strokeLinecap="round"
                strokeDasharray={`${track} ${c}`}
              />
              <circle
                cx={RING_CX} cy={RING_CY} r={r}
                fill="none" stroke="#fff"
                strokeWidth={sw} strokeLinecap="round"
                strokeDasharray={`${fill} ${c}`}
              />
            </g>
          );
        })}

        {legend.map(({ cat, label, r }, i) => {
          const y = legendY0 + i * legendGap;
          const lineY = y - 5;
          const lineStart = 190;
          const lineEnd = Math.min(RING_CX + r, VB_W - 5);
          return (
            <g key={i}>
              <text x={20} y={y} xmlSpace="preserve">
                <tspan style={{ font: "500 14.5px Inter, sans-serif", fill: "#fff" }}>
                  {cat.name}
                </tspan>
                <tspan dx={10} style={{ font: "600 14.5px Inter, sans-serif", fill: "#fff", fontVariantNumeric: "tabular-nums" }}>
                  {label}
                </tspan>
              </text>
              {lineEnd > lineStart && (
                <line
                  x1={lineStart} y1={lineY} x2={lineEnd} y2={lineY}
                  stroke="rgba(255,255,255,0.45)"
                  strokeWidth={1.4}
                  strokeDasharray="4 5"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
