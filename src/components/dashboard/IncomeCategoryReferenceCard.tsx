import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";

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
  "#0C0D0E",
  "url(#inc-ring-stripe)",
  "rgba(255,255,255,0.35)",
  "#7A8494",
  "rgba(255,255,255,0.55)",
  "#C4CDD8",
  "rgba(255,255,255,0.18)",
];

const DOT_CSS: React.CSSProperties[] = [
  { backgroundColor: "#ffffff" },
  { backgroundColor: "#0C0D0E" },
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
  const sorted = useMemo(
    () => [...data].sort((a, b) => b.value - a.value),
    [data],
  );

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

      <div className="px-5 pt-[18px] pb-2">
        <p className="text-[15px] font-heading font-bold text-white">
          {t("charts.incomeByCategory", "Income by Category")}
        </p>
      </div>

      <div className="flex flex-1 items-center px-5 pb-[18px] pt-0">
        <div className="flex w-full select-none flex-col items-center justify-center gap-5 [-webkit-tap-highlight-color:transparent] sm:flex-row-reverse sm:items-center sm:gap-[26px]">
          <div className="relative shrink-0" style={{ width: 200, height: 186 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sorted}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="72%"
                  outerRadius="100%"
                  startAngle={225}
                  endAngle={-45}
                  paddingAngle={2}
                  cornerRadius={5}
                  stroke="none"
                  isAnimationActive={false}
                  onClick={(d: { name?: string }) => toggle(d?.name)}
                >
                  {sorted.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={SLICE_FILLS[i % SLICE_FILLS.length]}
                      fillOpacity={active && active !== entry.name ? 0.25 : 1}
                      className="cursor-pointer outline-none transition-[fill-opacity] duration-150 focus:outline-none"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 pb-3 text-center">
              {activeEntry ? (
                <>
                  <span className="max-w-full truncate text-[12px] font-medium text-white/70">
                    {activeEntry.name}
                  </span>
                  <span className="text-[16px] md:text-[19px] font-semibold tabular-nums leading-tight tracking-[-0.02em] text-white">
                    {formatCurrency(activeEntry.value)}
                  </span>
                  <span className="text-[12px] tabular-nums text-white/70">
                    {pctLabel(activeEntry.value)}
                  </span>
                </>
              ) : (
                <span className="text-[17px] md:text-[20px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-white">
                  {formatCurrency(total)}
                </span>
              )}
            </div>
          </div>

          <ul className="w-full flex-1">
            {sorted.map((entry, i) => {
              const dimmed = active !== null && active !== entry.name;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => toggle(entry.name)}
                    aria-pressed={active === entry.name}
                    className={cn(
                      "-mx-1 flex w-full items-center gap-[10px] rounded-lg px-1 py-[3px] text-left transition-colors",
                      active === entry.name && "bg-white/10",
                      dimmed && "opacity-45",
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={DOT_CSS[i % DOT_CSS.length]}
                    />
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-white">
                      {entry.name}
                    </span>
                    <span className="w-[46px] shrink-0 text-right text-[13px] font-medium tabular-nums text-white">
                      {pctLabel(entry.value)}
                    </span>
                    <span className="w-[92px] shrink-0 text-right text-[13px] tabular-nums text-white/70">
                      {formatCurrency(entry.value)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
