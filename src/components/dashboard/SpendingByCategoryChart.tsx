import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import { useCategoryTranslations } from "@/hooks/useCategoryTranslations";
import { CategoryIcon } from "@/components/ui/category-icon";

interface CategoryData {
  name: string;
  value: number;
  color: string;
  category?: string;
  previousValue?: number;
}

interface SpendingByCategoryChartProps {
  data: CategoryData[];
  monthKey?: string | null;
}

interface TreemapEntry {
  name: string;
  value: number;
  color: string;
  category: string;
  weight: number;
  previousValue: number;
  pctChange: number | null;
}

type ToggleMode = "weight" | "vs";

const MAIN_THRESHOLD = 0.02;
const MAX_MAIN = 6;

export function SpendingByCategoryChart({ data, monthKey }: SpendingByCategoryChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const [mode, setMode] = useState<ToggleMode>("weight");

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const { main, strip } = useMemo(() => {
    if (total === 0) return { main: [] as TreemapEntry[], strip: [] as TreemapEntry[] };

    const sorted = [...data]
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);

    const mainItems: TreemapEntry[] = [];
    const stripItems: TreemapEntry[] = [];

    for (const item of sorted) {
      const weight = item.value / total;
      const prev = item.previousValue ?? 0;
      const pctChange =
        prev > 0 ? Math.round(((item.value - prev) / prev) * 100) : null;

      const entry: TreemapEntry = {
        name: item.name,
        value: item.value,
        color: item.color,
        category: item.category ?? "",
        weight,
        previousValue: prev,
        pctChange,
      };

      if (weight >= MAIN_THRESHOLD && mainItems.length < MAX_MAIN) {
        mainItems.push(entry);
      } else {
        stripItems.push(entry);
      }
    }

    return { main: mainItems, strip: stripItems };
  }, [data, total]);

  const categoryCount = [...main, ...strip].length;

  const prevMonthLabel = useMemo(() => {
    if (monthKey) {
      const [y, m] = monthKey.split("-").map(Number);
      const prev = new Date(y, m - 2, 1);
      return prev.toLocaleDateString(undefined, { month: "long" });
    }
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString(
      undefined,
      { month: "long" },
    );
  }, [monthKey]);

  if (!hasData) {
    return (
      <Card variant="bento">
        <div className="p-[18px_22px_16px]">
          <p className="text-[15px] font-heading font-semibold text-[#0C0D0E]">
            {t("charts.spendingByCategory", "Spending by category")}
          </p>
        </div>
        <div className="px-[22px] pb-4">
          <EmptyState height="h-[276px]" />
        </div>
      </Card>
    );
  }

  const pctLabel = (weight: number) => {
    const p = weight * 100;
    const rounded = p < 10 ? Math.round(p * 10) / 10 : Math.round(p);
    const s = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1).replace(".", ",");
    return `${s}%`;
  };

  const changeLabel = (entry: TreemapEntry) => {
    if (entry.pctChange === null) return t("charts.treemapNew", "new");
    if (entry.pctChange === 0) return "=";
    const abs = Math.abs(entry.pctChange);
    const display = abs > 999 ? ">999" : String(abs);
    return `${entry.pctChange > 0 ? "↑" : "↓"} ${display}%`;
  };

  const changeColor = (entry: TreemapEntry) => {
    if (entry.pctChange === null || entry.pctChange === 0)
      return "rgba(12,13,14,.42)";
    return entry.pctChange > 0 ? "#C9502A" : "#1F7A45";
  };

  const tileColors = (category: string) => {
    const colorVar = getCategoryColor(category);
    if (typeof window !== "undefined") {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue(`--${colorVar}`)
        .trim();
      if (raw) {
        const alpha = colorVar === "category-travel" ? 0.2 : 0.13;
        return {
          bg: `hsl(${raw} / ${alpha})`,
          icon: `hsl(${raw})`,
          number: `hsl(${raw})`,
          name: `hsl(${raw} / 0.7)`,
        };
      }
    }
    return {
      bg: "rgba(127,134,143,.13)",
      icon: "#656C75",
      number: "#656C75",
      name: "#7A8189",
    };
  };

  type TileSize = "major" | "large" | "medium" | "strip";

  const scales: Record<TileSize, {
    padding: string; gap: number; icon: number;
    nameSize: number; amountSize: number; detailSize: number;
  }> = {
    major:  { padding: "15px 17px", gap: 5, icon: 15, nameSize: 13,   amountSize: 27,   detailSize: 13 },
    large:  { padding: "13px 15px", gap: 4, icon: 14, nameSize: 12.5, amountSize: 22,   detailSize: 12 },
    medium: { padding: "11px 13px", gap: 3, icon: 13, nameSize: 11.5, amountSize: 17,   detailSize: 11.5 },
    strip:  { padding: "9px 11px 10px", gap: 2, icon: 12, nameSize: 11, amountSize: 13.5, detailSize: 10.5 },
  };

  const getTileSize = (weight: number, isStrip: boolean): TileSize => {
    if (isStrip) return "strip";
    if (weight >= 0.4) return "major";
    if (weight >= 0.15) return "large";
    return "medium";
  };

  const renderTile = (entry: TreemapEntry, size: TileSize) => {
    const s = scales[size];
    const colors = tileColors(entry.category);
    const iconName = getCategoryIcon(entry.category);
    const colorVar = getCategoryColor(entry.category);
    const radius = size === "strip" ? 9 : 11;

    return (
      <div
        className="flex flex-col items-end justify-start min-w-0 min-h-0 h-full"
        style={{
          backgroundColor: colors.bg,
          borderRadius: radius,
          padding: s.padding,
          gap: s.gap,
        }}
      >
        <div
          className="flex items-center gap-[6px] self-end min-w-0"
          style={{ whiteSpace: "nowrap" }}
        >
          <CategoryIcon
            iconName={iconName}
            colorVar={colorVar}
            size="sm"
            showBackground={false}
            className="flex-shrink-0"
          />
          <span
            className="truncate"
            style={{
              fontSize: s.nameSize,
              color: colors.name,
              fontWeight: 400,
              lineHeight: 1.2,
            }}
          >
            {entry.name}
          </span>
        </div>

        <span
          className="tabular-nums"
          style={{
            fontSize: s.amountSize,
            fontWeight: 600,
            color: colors.number,
            letterSpacing: s.amountSize >= 22 ? "-0.025em" : "-0.02em",
            lineHeight: 1,
          }}
        >
          {formatCurrency(entry.value)}
        </span>

        <span
          className="tabular-nums"
          style={{
            fontSize: s.detailSize,
            fontWeight: 500,
            color: mode === "weight" ? "rgba(12,13,14,.42)" : changeColor(entry),
            lineHeight: 1.2,
          }}
        >
          {mode === "weight" ? pctLabel(entry.weight) : changeLabel(entry)}
        </span>

        <span className="sr-only">
          {entry.name}, {formatCurrency(entry.value)}, {pctLabel(entry.weight)}
          {entry.pctChange !== null && `, ${changeLabel(entry)}`}
        </span>
      </div>
    );
  };

  const renderMainLayout = () => {
    if (main.length === 0) return null;

    if (main.length === 1) {
      return (
        <div className="flex-1 min-h-0">
          {renderTile(main[0], getTileSize(main[0].weight, false))}
        </div>
      );
    }

    if (main.length <= 3) {
      return (
        <div className="flex-1 flex min-h-0" style={{ gap: 6 }}>
          {main.map((entry) => (
            <div key={entry.category} style={{ flex: entry.weight }} className="min-w-0">
              {renderTile(entry, getTileSize(entry.weight, false))}
            </div>
          ))}
        </div>
      );
    }

    const largest = main[0];
    const rest = main.slice(1);
    const largestW = largest.weight;
    const restW = rest.reduce((s, e) => s + e.weight, 0);
    const totalW = largestW + restW;

    return (
      <div className="flex-1 flex min-h-0" style={{ gap: 6 }}>
        <div className="min-w-0" style={{ flex: (largestW / totalW) * 100 }}>
          {renderTile(largest, getTileSize(largest.weight, false))}
        </div>
        <div
          className="flex flex-col min-w-0"
          style={{ flex: (restW / totalW) * 100, gap: 6 }}
        >
          {rest.length <= 2 ? (
            rest.map((entry) => (
              <div key={entry.category} className="min-h-0" style={{ flex: entry.weight }}>
                {renderTile(entry, getTileSize(entry.weight, false))}
              </div>
            ))
          ) : (
            <>
              <div className="min-h-0" style={{ flex: rest[0].weight }}>
                {renderTile(rest[0], getTileSize(rest[0].weight, false))}
              </div>
              <div
                className="flex min-h-0"
                style={{
                  flex: rest.slice(1).reduce((s, e) => s + e.weight, 0),
                  gap: 6,
                }}
              >
                {rest.slice(1).map((entry) => (
                  <div key={entry.category} className="min-w-0" style={{ flex: entry.weight }}>
                    {renderTile(entry, getTileSize(entry.weight, false))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card
      variant="bento"
      className="flex h-full flex-col overflow-hidden"
      style={{
        borderRadius: 12,
        boxShadow:
          "0 1px 2px rgba(16,24,40,.04), 0 6px 16px -6px rgba(16,24,40,.10)",
        border: "none",
      }}
    >
      <div
        className="flex items-start justify-between gap-3 px-[22px] pt-[18px] pb-0"
        style={{ marginBottom: 13 }}
      >
        <div className="min-w-0">
          <p className="text-[15px] font-heading font-semibold text-[#0C0D0E]">
            {t("charts.spendingByCategory", "Spending by category")}
          </p>
          <p
            className="text-[12.5px] text-[#9AA1AC] mt-[2px]"
            style={{ whiteSpace: "nowrap" }}
          >
            {formatCurrency(total)}{" "}
            {t("charts.treemapInCategories", "in {{count}} categories", {
              count: categoryCount,
            })}
          </p>
        </div>

        <div
          className="flex shrink-0"
          role="radiogroup"
          aria-label={t("charts.treemapToggleLabel", "Display mode")}
          style={{
            background: "#F1F3F5",
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === "weight"}
            onClick={() => setMode("weight")}
            style={{
              height: 24,
              padding: "0 11px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              background: mode === "weight" ? "#fff" : "transparent",
              color: mode === "weight" ? "#0C0D0E" : "#8A919C",
              boxShadow:
                mode === "weight"
                  ? "0 1px 2px rgba(16,24,40,.10)"
                  : "none",
            }}
          >
            {t("charts.treemapWeight", "Weight")}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === "vs"}
            onClick={() => setMode("vs")}
            style={{
              height: 24,
              padding: "0 11px",
              borderRadius: 6,
              fontSize: 11.5,
              fontWeight: 500,
              cursor: "pointer",
              border: "none",
              background: mode === "vs" ? "#fff" : "transparent",
              color: mode === "vs" ? "#0C0D0E" : "#8A919C",
              boxShadow:
                mode === "vs" ? "0 1px 2px rgba(16,24,40,.10)" : "none",
            }}
          >
            vs. {prevMonthLabel}
          </button>
        </div>
      </div>

      <div
        className="flex-1 flex flex-col px-[22px] pb-4"
        style={{ gap: 6, minHeight: 276 }}
      >
        {renderMainLayout()}

        {strip.length > 0 && (
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${Math.min(strip.length, 4)}, 1fr)`,
              gap: 6,
            }}
          >
            {strip.map((entry) => renderTile(entry, "strip"))}
          </div>
        )}
      </div>
    </Card>
  );
}
