import { useMemo, useState, useRef, useEffect } from "react";
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
  vsPrevLabel?: string;
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

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutNode extends TreemapEntry {
  rect: Rect;
}

type ToggleMode = "weight" | "vs";

const GAP = 5;
const STRIP_H = 68;

function squarify(
  items: TreemapEntry[],
  container: Rect,
): LayoutNode[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], rect: container }];
  }

  const totalValue = items.reduce((s, it) => s + it.value, 0);
  const results: LayoutNode[] = [];
  let remaining = [...items];
  let rect = { ...container };

  while (remaining.length > 0) {
    const shorter = Math.min(rect.w, rect.h);
    const isHorizontal = rect.w >= rect.h;
    const areaLeft = rect.w * rect.h;
    const valueLeft = remaining.reduce((s, it) => s + it.value, 0);

    let row = [remaining[0]];
    let bestWorst = worstRatio(row, shorter, areaLeft, valueLeft);

    for (let i = 1; i < remaining.length; i++) {
      const candidate = [...row, remaining[i]];
      const candidateWorst = worstRatio(candidate, shorter, areaLeft, valueLeft);
      if (candidateWorst <= bestWorst) {
        row = candidate;
        bestWorst = candidateWorst;
      } else {
        break;
      }
    }

    const rowValue = row.reduce((s, it) => s + it.value, 0);
    const rowFraction = rowValue / valueLeft;

    if (isHorizontal) {
      const rowW = rect.w * rowFraction;
      let y = rect.y;
      for (const item of row) {
        const itemH = (item.value / rowValue) * rect.h;
        results.push({ ...item, rect: { x: rect.x, y, w: rowW, h: itemH } });
        y += itemH;
      }
      rect = { x: rect.x + rowW, y: rect.y, w: rect.w - rowW, h: rect.h };
    } else {
      const rowH = rect.h * rowFraction;
      let x = rect.x;
      for (const item of row) {
        const itemW = (item.value / rowValue) * rect.w;
        results.push({ ...item, rect: { x, y: rect.y, w: itemW, h: rowH } });
        x += itemW;
      }
      rect = { x: rect.x, y: rect.y + rowH, w: rect.w, h: rect.h - rowH };
    }

    remaining = remaining.slice(row.length);
  }

  return results;
}

function worstRatio(
  row: TreemapEntry[],
  side: number,
  totalArea: number,
  totalValue: number,
): number {
  const rowValue = row.reduce((s, it) => s + it.value, 0);
  const rowArea = (rowValue / totalValue) * totalArea;
  const rowLen = rowArea / side;

  let worst = 0;
  for (const item of row) {
    const itemArea = (item.value / totalValue) * totalArea;
    const itemLen = itemArea / rowLen;
    const ratio = Math.max(rowLen / itemLen, itemLen / rowLen);
    if (ratio > worst) worst = ratio;
  }
  return worst;
}

export function SpendingByCategoryChart({
  data,
  vsPrevLabel,
}: SpendingByCategoryChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const { getCategoryIcon, getCategoryColor } = useCategoryTranslations();
  const [mode, setMode] = useState<ToggleMode>("weight");
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  const entries = useMemo(() => {
    if (total === 0) return [] as TreemapEntry[];
    return [...data]
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .map((item) => {
        const weight = item.value / total;
        const prev = item.previousValue ?? 0;
        const pctChange =
          prev > 0 ? Math.round(((item.value - prev) / prev) * 100) : null;
        return {
          name: item.name,
          value: item.value,
          color: item.color,
          category: item.category ?? "",
          weight,
          previousValue: prev,
          pctChange,
        };
      });
  }, [data, total]);

  const categoryCount = entries.length;

  const { mainEntries, stripEntries } = useMemo(() => {
    const main: TreemapEntry[] = [];
    const strip: TreemapEntry[] = [];
    for (const e of entries) {
      if (e.weight >= 0.02 && main.length < 6) main.push(e);
      else strip.push(e);
    }
    return { mainEntries: main, stripEntries: strip };
  }, [entries]);

  const hasStrip = stripEntries.length > 0;
  const stripCols = containerSize.w < 400
    ? Math.min(stripEntries.length, 2)
    : Math.min(stripEntries.length, 4);
  const stripRows = hasStrip ? Math.ceil(stripEntries.length / stripCols) : 0;
  const totalStripH = hasStrip ? stripRows * STRIP_H + (stripRows - 1) * GAP : 0;

  const layoutNodes = useMemo(() => {
    if (containerSize.w === 0 || containerSize.h === 0) return [];
    const mainH = hasStrip
      ? containerSize.h - totalStripH - GAP
      : containerSize.h;
    if (mainH <= 0 || mainEntries.length === 0) return [];
    return squarify(mainEntries, { x: 0, y: 0, w: containerSize.w, h: mainH });
  }, [mainEntries, containerSize, hasStrip, totalStripH]);


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

  const tileContent = (
    entry: TreemapEntry,
    areaW: number,
    areaH: number,
    isStrip: boolean,
  ) => {
    const colors = tileColors(entry.category);
    const iconName = getCategoryIcon(entry.category);
    const colorVar = getCategoryColor(entry.category);

    const tiny = !isStrip && (areaW < 100 || areaH < 80);
    const nameSize = isStrip ? 11 : tiny ? 11 : areaW > 180 ? 13 : 12;
    const amountSize = isStrip
      ? 13.5
      : tiny
        ? 14
        : areaW > 180 && areaH > 120
          ? 27
          : areaW > 140
            ? 20
            : 16;
    const detailSize = isStrip ? 10.5 : tiny ? 10 : amountSize > 20 ? 13 : 11.5;
    const pad = isStrip
      ? "9px 11px 10px"
      : tiny
        ? "8px 10px"
        : amountSize > 20
          ? "15px 17px"
          : "11px 13px";
    const gapVal = isStrip ? 2 : tiny ? 2 : amountSize > 20 ? 5 : 3;
    const showName = !tiny || areaW >= 72;

    return (
      <div
        className="flex flex-col items-end justify-start w-full h-full overflow-hidden"
        style={{
          backgroundColor: colors.bg,
          borderRadius: isStrip ? 4 : 5,
          padding: pad,
          gap: gapVal,
        }}
      >
        {showName && (
          <div
            className="flex items-center gap-[5px] self-end min-w-0 max-w-full"
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
                fontSize: nameSize,
                color: colors.name,
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {entry.name}
            </span>
          </div>
        )}

        <span
          className="tabular-nums"
          style={{
            fontSize: amountSize,
            fontWeight: 600,
            color: colors.number,
            letterSpacing: amountSize >= 20 ? "-0.025em" : "-0.02em",
            lineHeight: 1,
          }}
        >
          {formatCurrency(entry.value)}
        </span>

        <span
          className="tabular-nums"
          style={{
            fontSize: detailSize,
            fontWeight: 500,
            color:
              mode === "weight" ? "rgba(12,13,14,.42)" : changeColor(entry),
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

  const mainH = hasStrip
    ? containerSize.h - totalStripH - GAP
    : containerSize.h;

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
            {vsPrevLabel ?? t("charts.treemapVsPrev", "vs. prev month")}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 mx-[22px] mb-4 relative"
        style={{ minHeight: 276 }}
      >
        {layoutNodes.map((node) => {
          const half = GAP / 2;
          return (
            <div
              key={node.category}
              className="absolute"
              style={{
                left: node.rect.x + half,
                top: node.rect.y + half,
                width: node.rect.w - GAP,
                height: node.rect.h - GAP,
              }}
            >
              {tileContent(
                node,
                node.rect.w - GAP,
                node.rect.h - GAP,
                false,
              )}
            </div>
          );
        })}

        {hasStrip && (
          <div
            className="absolute left-0 right-0 grid"
            style={{
              top: mainH + GAP / 2,
              gridTemplateColumns: `repeat(${stripCols}, 1fr)`,
              gap: GAP,
            }}
          >
            {stripEntries.map((entry) => (
              <div key={entry.category} style={{ height: STRIP_H }}>
                {tileContent(entry, 999, STRIP_H, true)}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
