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
const STRIP_H = 54;

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
  const [hoveredTile, setHoveredTile] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const hasData = data.length > 0 && total > 0;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        setContainerSize({ w: width, h: height });
      }
    };
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [hasData]);

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
    if (entries.length <= 10) return { mainEntries: entries, stripEntries: [] as TreemapEntry[] };
    const main: TreemapEntry[] = [];
    const strip: TreemapEntry[] = [];
    for (const e of entries) {
      if (e.weight >= 0.01 && main.length < 10) main.push(e);
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
        <div className="px-[14px] pt-3 pb-0 md:px-5 md:pt-[16px] md:pb-0">
          <p className="text-[14px] font-heading font-bold text-foreground">
            {t("charts.spendingByCategory", "Spending by category")}
          </p>
        </div>
        <div className="px-[14px] pb-3 md:px-5 md:pb-[20px]">
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
    return entry.pctChange > 0 ? "hsl(var(--destructive))" : "hsl(var(--success))";
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
      bg: "hsl(var(--muted))",
      icon: "hsl(var(--muted-foreground))",
      number: "hsl(var(--muted-foreground))",
      name: "hsl(var(--muted-foreground) / 0.7)",
    };
  };

  const AMOUNT_SIZE = 14;
  const NAME_SIZE = 11.5;
  const DETAIL_SIZE = 11;
  const MIN_TILE_W = 70;
  const MIN_TILE_H = 60;

  const tileContent = (
    entry: TreemapEntry,
    areaW: number,
    areaH: number,
    isStrip: boolean,
  ) => {
    const colors = tileColors(entry.category);
    const iconName = getCategoryIcon(entry.category);
    const colorVar = getCategoryColor(entry.category);

    const tooSmall = !isStrip && (areaW < MIN_TILE_W || areaH < MIN_TILE_H);

    if (tooSmall) {
      return (
        <div
          className="w-full h-full cursor-pointer"
          style={{ backgroundColor: colors.bg, borderRadius: 5 }}
          onMouseEnter={() => setHoveredTile(entry.category)}
          onMouseLeave={() => setHoveredTile(null)}
        >
          <span className="sr-only">
            {entry.name}, {formatCurrency(entry.value)}, {pctLabel(entry.weight)}
          </span>
        </div>
      );
    }

    return (
      <div
        className="flex flex-col items-end justify-start w-full h-full overflow-hidden cursor-pointer"
        style={{
          backgroundColor: colors.bg,
          borderRadius: isStrip ? 4 : 5,
          padding: isStrip ? "9px 11px 10px" : "10px 12px",
          gap: isStrip ? 2 : 3,
        }}
        onMouseEnter={() => setHoveredTile(entry.category)}
        onMouseLeave={() => setHoveredTile(null)}
      >
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
              fontSize: isStrip ? 11 : NAME_SIZE,
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
            fontSize: isStrip ? 13.5 : AMOUNT_SIZE,
            fontWeight: 600,
            color: colors.number,
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          {formatCurrency(entry.value)}
        </span>

        <span
          className="tabular-nums"
          style={{
            fontSize: isStrip ? 10.5 : DETAIL_SIZE,
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
      className="flex flex-col overflow-hidden rounded-xl border-none shadow-section lg:h-full"
    >
      <div
        className="flex items-start justify-between gap-3 px-[14px] md:px-5 pt-3 md:pt-[16px] pb-0"
        style={{ marginBottom: 10 }}
      >
        <div className="min-w-0">
          <p className="text-[14px] font-heading font-bold text-foreground">
            {t("charts.spendingByCategory", "Spending by category")}
          </p>
          <p
            className="text-[12.5px] text-muted-foreground mt-[2px]"
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
            background: "hsl(var(--muted))",
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
              background: mode === "weight" ? "hsl(var(--card))" : "transparent",
              color: mode === "weight" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow:
                mode === "weight"
                  ? "var(--shadow-sm)"
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
              background: mode === "vs" ? "hsl(var(--card))" : "transparent",
              color: mode === "vs" ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))",
              boxShadow:
                mode === "vs" ? "var(--shadow-sm)" : "none",
            }}
          >
            {vsPrevLabel ?? t("charts.treemapVsPrev", "vs. prev month")}
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="min-h-[300px] lg:min-h-0 lg:flex-1 mx-[14px] md:mx-5 mb-3 md:mb-[20px] relative overflow-hidden"
        onMouseMove={(e) => {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => { setHoveredTile(null); setTooltipPos(null); }}
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

        {hoveredTile && tooltipPos && (() => {
          const entry = entries.find((e) => e.category === hoveredTile);
          if (!entry) return null;
          const colors = tileColors(entry.category);
          const flipX = tooltipPos.x > containerSize.w / 2;
          const flipY = tooltipPos.y > containerSize.h / 2;
          return (
            <div
              className="pointer-events-none absolute z-50"
              style={{
                left: flipX ? tooltipPos.x - 8 : tooltipPos.x + 8,
                top: flipY ? tooltipPos.y - 8 : tooltipPos.y + 8,
                transform: `translate(${flipX ? "-100%" : "0"}, ${flipY ? "-100%" : "0"})`,
              }}
            >
              <div
                className="rounded-lg px-3 py-2 text-foreground shadow-popup"
                style={{ background: "hsl(var(--card))", minWidth: 140 }}
              >
                <p className="text-[11.5px] font-medium" style={{ color: colors.number }}>
                  {entry.name}
                </p>
                <p className="text-[14px] font-semibold tabular-nums mt-0.5">
                  {formatCurrency(entry.value)}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                  {pctLabel(entry.weight)}
                  {entry.pctChange !== null && (
                    <span style={{ color: changeColor(entry), marginLeft: 6 }}>
                      {changeLabel(entry)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          );
        })()}
      </div>
    </Card>
  );
}
