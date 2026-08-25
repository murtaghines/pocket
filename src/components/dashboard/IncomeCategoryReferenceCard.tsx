import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface IncomeCategoryReferenceCardProps {
  data: CategoryData[];
}

const SLICE_FILLS = [
  "#ffffff",
  "#1A1D23",
  "url(#inc-ring-stripe)",
  "rgba(255,255,255,0.35)",
  "#7A8494",
  "rgba(255,255,255,0.55)",
  "#C4CDD8",
  "rgba(255,255,255,0.20)",
];

const RADIAN = Math.PI / 180;
const LABEL_MIN_PCT = 0.015;

export function IncomeCategoryReferenceCard({
  data,
}: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const sorted = useMemo(() => {
    if (total === 0) return [];
    const s = [...data]
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    const significant: CategoryData[] = [];
    let otherTotal = 0;
    for (const item of s) {
      if (item.value / total >= 0.01) significant.push(item);
      else otherTotal += item.value;
    }
    if (otherTotal > 0) {
      significant.push({
        name: t("charts.otherCategories", "Other"),
        value: otherTotal,
        color: "#7A8494",
      });
    }
    return significant;
  }, [data, total, t]);

  const [active, setActive] = useState<string | null>(null);
  const activeEntry = active
    ? sorted.find((e) => e.name === active) ?? null
    : null;
  const toggle = (name?: string) => {
    if (!name) return;
    setActive((cur) => (cur === name ? null : name));
  };

  const pctLabel = useCallback(
    (value: number) => {
      const p = (value / total) * 100;
      const rounded = p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
      const s = Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(1).replace(".", ",");
      return `${s}%`;
    },
    [total],
  );

  const renderLabel = useCallback(
    (props: {
      cx: number;
      cy: number;
      midAngle: number;
      outerRadius: number;
      name: string;
      percent: number;
    }) => {
      const { cx, cy, midAngle, outerRadius, name, percent } = props;
      if (percent < LABEL_MIN_PCT) return null;

      const cos = Math.cos(-RADIAN * midAngle);
      const sin = Math.sin(-RADIAN * midAngle);

      const sx = cx + outerRadius * cos;
      const sy = cy + outerRadius * sin;
      const mx = cx + (outerRadius + 14) * cos;
      const my = cy + (outerRadius + 14) * sin;
      const ex = mx + (cos >= 0 ? 1 : -1) * 18;
      const ey = my;
      const textAnchor = cos >= 0 ? "start" : "end";
      const tx = ex + (cos >= 0 ? 5 : -5);
      const pct = Math.round(percent * 100);

      return (
        <g>
          <path
            d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
            stroke="rgba(255,255,255,0.4)"
            fill="none"
            strokeWidth={1}
          />
          <circle cx={sx} cy={sy} r={2} fill="rgba(255,255,255,0.6)" />
          <text
            x={tx}
            y={ey + 4}
            textAnchor={textAnchor}
            fill="#fff"
            fontSize={12}
            fontWeight={500}
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            {name} ({pct}%)
          </text>
        </g>
      );
    },
    [],
  );

  if (!hasData) {
    return (
      <div className="w-full h-full rounded-xl bg-[#5191FF] p-[20px_22px] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] flex flex-col overflow-hidden">
        <p className="text-[15px] font-heading font-bold text-white mb-[6px]">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
        <EmptyState height="h-[220px]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col rounded-xl bg-[#5191FF] shadow-[0_1px_2px_rgba(27,118,255,.18),0_8px_20px_-8px_rgba(27,118,255,.45)] overflow-hidden">
      <svg width="0" height="0" className="absolute" aria-hidden>
        <defs>
          <pattern
            id="inc-ring-stripe"
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="8" height="8" fill="transparent" />
            <rect width="3.5" height="8" fill="#ffffff" />
          </pattern>
        </defs>
      </svg>

      <div className="px-5 pt-[18px] pb-0">
        <p className="text-[15px] font-heading font-bold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
      </div>

      <div className="flex-1 relative min-h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sorted}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="36%"
              outerRadius="52%"
              startAngle={90}
              endAngle={-270}
              paddingAngle={2}
              cornerRadius={4}
              stroke="none"
              isAnimationActive={false}
              label={renderLabel}
              labelLine={false}
              onClick={(d: { name?: string }) => toggle(d?.name)}
            >
              {sorted.map((entry, i) => (
                <Cell
                  key={i}
                  fill={SLICE_FILLS[i % SLICE_FILLS.length]}
                  fillOpacity={
                    active && active !== entry.name ? 0.25 : 1
                  }
                  className="cursor-pointer outline-none transition-[fill-opacity] duration-150 focus:outline-none"
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            {activeEntry ? (
              <>
                <p className="max-w-[90px] mx-auto truncate text-[11px] font-medium text-white/70 mb-0.5">
                  {activeEntry.name}
                </p>
                <p className="text-[17px] font-semibold tabular-nums leading-tight tracking-[-0.02em] text-white">
                  {formatCurrency(activeEntry.value)}
                </p>
                <p className="text-[11px] tabular-nums text-white/70 mt-0.5">
                  {pctLabel(activeEntry.value)}
                </p>
              </>
            ) : (
              <p className="text-[17px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-white">
                {formatCurrency(total)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
