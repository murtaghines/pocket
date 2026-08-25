import { useMemo, useState } from "react";
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
  "rgba(255,255,255,0.18)",
];

const DOT_CSS: React.CSSProperties[] = [
  { backgroundColor: "#ffffff" },
  { backgroundColor: "#1A1D23" },
  {
    backgroundImage:
      "repeating-linear-gradient(45deg, #fff 0px, #fff 1.5px, transparent 1.5px, transparent 3px)",
  },
  { backgroundColor: "rgba(255,255,255,0.35)" },
  { backgroundColor: "#7A8494" },
  { backgroundColor: "rgba(255,255,255,0.55)" },
  { backgroundColor: "#C4CDD8" },
  { backgroundColor: "rgba(255,255,255,0.18)" },
];

export function IncomeCategoryReferenceCard({
  data,
}: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const sorted = useMemo(() => {
    if (total === 0) return [];
    const significant: (CategoryData & { pct: number })[] = [];
    let otherTotal = 0;

    const s = [...data].filter((d) => d.value > 0).sort((a, b) => b.value - a.value);

    for (const item of s) {
      if (item.value / total >= 0.01) {
        significant.push({ ...item, pct: (item.value / total) * 100 });
      } else {
        otherTotal += item.value;
      }
    }

    if (otherTotal > 0) {
      significant.push({
        name: t("charts.otherCategories", "Other"),
        value: otherTotal,
        color: "#7A8494",
        pct: (otherTotal / total) * 100,
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

  const pctLabel = (value: number) => {
    const p = (value / total) * 100;
    const rounded = p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
    const s = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${s}%`;
  };

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
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="6" height="6" fill="rgba(81,145,255,0.5)" />
            <rect width="2.5" height="6" fill="#ffffff" />
          </pattern>
        </defs>
      </svg>

      <div className="px-5 pt-[18px] pb-0">
        <p className="text-[15px] font-heading font-bold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-5 pb-3">
        <div className="relative w-full" style={{ maxWidth: 180, aspectRatio: "1" }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sorted}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius="68%"
                outerRadius="100%"
                startAngle={90}
                endAngle={-270}
                paddingAngle={2.5}
                cornerRadius={5}
                stroke="none"
                isAnimationActive={false}
                onClick={(d: { name?: string }) => toggle(d?.name)}
              >
                {sorted.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={SLICE_FILLS[i % SLICE_FILLS.length]}
                    fillOpacity={active && active !== entry.name ? 0.2 : 1}
                    className="cursor-pointer outline-none transition-[fill-opacity] duration-150 focus:outline-none"
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center px-4">
              {activeEntry ? (
                <>
                  <p className="max-w-[100px] mx-auto truncate text-[11px] font-medium text-white/65 mb-0.5">
                    {activeEntry.name}
                  </p>
                  <p className="text-[18px] font-semibold tabular-nums leading-tight tracking-[-0.02em] text-white">
                    {formatCurrency(activeEntry.value)}
                  </p>
                  <p className="text-[11px] tabular-nums text-white/65 mt-0.5">
                    {pctLabel(activeEntry.value)}
                  </p>
                </>
              ) : (
                <p className="text-[18px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-white">
                  {formatCurrency(total)}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="w-full mt-3 flex flex-wrap justify-center gap-x-4 gap-y-[5px]">
          {sorted.map((entry, i) => {
            const dimmed = active !== null && active !== entry.name;
            return (
              <button
                key={i}
                type="button"
                onClick={() => toggle(entry.name)}
                className="flex items-center gap-[5px] transition-opacity"
                style={{ opacity: dimmed ? 0.35 : 1 }}
              >
                <span
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={DOT_CSS[i % DOT_CSS.length]}
                />
                <span className="text-[11.5px] text-white/80 whitespace-nowrap">
                  {entry.name}
                </span>
                <span className="text-[11.5px] font-medium tabular-nums text-white">
                  {pctLabel(entry.value)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
