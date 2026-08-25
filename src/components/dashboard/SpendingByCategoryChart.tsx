import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  category?: string;
  previousValue?: number;
}

interface SpendingByCategoryChartProps {
  data: CategoryData[];
}

const MAX_BARS = 8;

export function SpendingByCategoryChart({ data }: SpendingByCategoryChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const sorted = useMemo(() => {
    const s = [...data].sort((a, b) => b.value - a.value);
    if (s.length <= MAX_BARS) return s;
    const head = s.slice(0, MAX_BARS - 1);
    const tail = s.slice(MAX_BARS - 1);
    const otherValue = tail.reduce((sum, item) => sum + item.value, 0);
    const otherPrevRaw = tail.reduce(
      (sum, item) => sum + (item.previousValue ?? 0),
      0,
    );
    return [
      ...head,
      {
        name: t("charts.otherCategories", "Other"),
        value: otherValue,
        color: "hsl(220, 10%, 50%)",
        previousValue: otherPrevRaw || undefined,
      },
    ];
  }, [data, t]);

  const maxValue = sorted.length > 0 ? sorted[0].value : 0;

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
      <Card variant="bento" className="">
        <CardHeader className="pb-2">
          <CardTitle>
            {t("charts.spendingByCategory", "Spending by category")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState height="h-[240px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="bento" className="flex h-full flex-col">
      <CardHeader className="px-5 pt-[18px] pb-3">
        <CardTitle>
          {t("charts.spendingByCategory", "Spending by category")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 px-5 pb-[18px] pt-0">
        <div className="flex flex-col gap-[10px]">
          {sorted.map((entry, i) => {
            const prev = entry.previousValue;
            const pct =
              prev !== undefined && prev > 0
                ? Math.round(((entry.value - prev) / prev) * 100)
                : undefined;
            const up = pct !== undefined && pct > 0;
            const down = pct !== undefined && pct < 0;
            const barWidth =
              maxValue > 0 ? (entry.value / maxValue) * 100 : 0;

            return (
              <div key={i}>
                <div className="flex items-center justify-between mb-[3px]">
                  <div className="flex items-center gap-[8px] min-w-0">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="truncate text-[13px] text-foreground">
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-[10px] shrink-0 ml-3">
                    <span className="text-[12.5px] font-medium tabular-nums text-foreground">
                      {pctLabel(entry.value)}
                    </span>
                    <span className="text-[12.5px] tabular-nums text-muted-foreground w-[80px] text-right">
                      {formatCurrency(entry.value)}
                    </span>
                    <span
                      className={cn(
                        "flex w-[40px] items-center justify-end gap-0.5 text-[11px] font-medium tabular-nums",
                        up
                          ? "text-destructive"
                          : down
                            ? "text-success"
                            : "text-muted-foreground/50",
                      )}
                    >
                      {up && (
                        <ArrowUp className="h-2.5 w-2.5" strokeWidth={2.6} />
                      )}
                      {down && (
                        <ArrowDown
                          className="h-2.5 w-2.5"
                          strokeWidth={2.6}
                        />
                      )}
                      {up || down ? `${Math.abs(pct!)}%` : "—"}
                    </span>
                  </div>
                </div>
                <div className="h-[5px] rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
