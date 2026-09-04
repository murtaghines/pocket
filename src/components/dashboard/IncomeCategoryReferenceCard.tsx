import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
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

export function IncomeCategoryReferenceCard({
  data,
}: IncomeCategoryReferenceCardProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const sorted = useMemo(() => {
    if (total === 0) return [];
    return [...data]
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((item) => ({ ...item, pct: (item.value / total) * 100 }));
  }, [data, total]);

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
      <Card variant="bento">
        <div className="p-[18px_22px_16px]">
          <p className="text-[15px] font-heading font-semibold text-foreground">
            {t("charts.incomeByCategory", "Income by Category")}
          </p>
        </div>
        <div className="px-[22px] pb-4">
          <EmptyState height="h-[220px]" />
        </div>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="flex h-full flex-col overflow-hidden">
      <div className="px-5 pt-[18px] pb-0">
        <p className="text-[15px] font-heading font-semibold text-foreground">
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
                    fill={entry.color}
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
                  <p className="max-w-[100px] mx-auto truncate text-[11px] font-medium text-muted-foreground mb-0.5">
                    {activeEntry.name}
                  </p>
                  <p className="text-[18px] font-semibold tabular-nums leading-tight tracking-[-0.02em] text-foreground">
                    {formatCurrency(activeEntry.value)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground mt-0.5">
                    {pctLabel(activeEntry.value)}
                  </p>
                </>
              ) : (
                <p className="text-[18px] font-semibold tabular-nums leading-none tracking-[-0.02em] text-foreground">
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
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[11.5px] text-muted-foreground whitespace-nowrap">
                  {entry.name}
                </span>
                <span className="text-[11.5px] font-medium tabular-nums text-foreground">
                  {pctLabel(entry.value)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
