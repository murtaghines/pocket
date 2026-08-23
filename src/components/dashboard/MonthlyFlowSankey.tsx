import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface MonthlyFlowSankeyProps {
  incomeCategories: CategoryData[];
  expenseCategories: CategoryData[];
  openingBalance?: number;
}

const BAR_W = 30;
const BAR_RADIUS = 7;
const PADDING_Y = 50;
const HEADER_H = 28;
const LABEL_H = 18;
const MIN_BAR_H = 6;

export function MonthlyFlowSankey({
  incomeCategories,
  expenseCategories,
  openingBalance = 0,
}: MonthlyFlowSankeyProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const { leftNodes, rightNodes, bands, svgH, svgW } = useMemo(() => {
    const svgW = 600;
    const incomeTotal = incomeCategories.reduce((s, c) => s + c.value, 0);
    const expenseTotal = expenseCategories.reduce((s, c) => s + c.value, 0);

    const leftCats = incomeCategories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    const rightCats = expenseCategories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);

    if (leftCats.length === 0 && rightCats.length === 0) {
      return { leftNodes: [], rightNodes: [], bands: [], svgH: 200, svgW };
    }

    const needsBalanceEntry = expenseTotal > incomeTotal && openingBalance > 0;
    const balanceEntry: CategoryData | null = needsBalanceEntry
      ? { name: t("stats.openingBalance", "Opening balance"), value: expenseTotal - incomeTotal, color: "#B4BAC3" }
      : null;

    const finalLeft = balanceEntry ? [...leftCats, balanceEntry] : leftCats;
    const maxTotal = Math.max(
      finalLeft.reduce((s, c) => s + c.value, 0),
      rightCats.reduce((s, c) => s + c.value, 0),
    );

    if (maxTotal === 0) return { leftNodes: [], rightNodes: [], bands: [], svgH: 200, svgW };

    const maxNodes = Math.max(finalLeft.length, rightCats.length);
    const gapBetweenBars = 6;
    const availableH = Math.max(180, maxNodes * 28 + (maxNodes - 1) * gapBetweenBars);
    const svgH = availableH + PADDING_Y * 2 + HEADER_H;

    const scale = (availableH - (maxNodes - 1) * gapBetweenBars) / maxTotal;

    const buildNodes = (cats: CategoryData[], x: number) => {
      let y = PADDING_Y + HEADER_H;
      return cats.map((c) => {
        const h = Math.max(MIN_BAR_H, c.value * scale);
        const node = { name: c.name, value: c.value, color: c.color, x, y, h };
        y += h + gapBetweenBars;
        return node;
      });
    };

    const leftX = 0;
    const rightX = svgW - BAR_W;
    const leftNodes = buildNodes(finalLeft, leftX);
    const rightNodes = buildNodes(rightCats, rightX);

    const bands: Array<{
      sx: number; sy: number; sh: number; sColor: string;
      dx: number; dy: number; dh: number; dColor: string;
      id: string;
    }> = [];

    const rightOffsets = rightNodes.map(() => 0);
    leftNodes.forEach((ln, li) => {
      const leftTotal = finalLeft.reduce((s, c) => s + c.value, 0);
      let leftOffset = 0;
      rightNodes.forEach((rn, ri) => {
        const flow = (ln.value / leftTotal) * rn.value;
        if (flow <= 0) return;
        const sh = Math.max(1, (flow / ln.value) * ln.h);
        const dh = Math.max(1, (flow / rn.value) * rn.h);
        bands.push({
          sx: ln.x + BAR_W, sy: ln.y + leftOffset, sh, sColor: ln.color,
          dx: rn.x, dy: rn.y + rightOffsets[ri], dh, dColor: rn.color,
          id: `band-${li}-${ri}`,
        });
        leftOffset += sh;
        rightOffsets[ri] += dh;
      });
    });

    return { leftNodes, rightNodes, bands, svgH, svgW };
  }, [incomeCategories, expenseCategories, openingBalance, t]);

  const hasData = leftNodes.length > 0 || rightNodes.length > 0;

  return (
    <div className="bg-card rounded-xl p-[20px_22px_16px] shadow-section h-full">
      <p className="text-[15px] font-heading font-semibold text-foreground mb-3">
        {t("charts.monthlyFlow", "Monthly flow")}
      </p>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
            <defs>
              {bands.map((b) => (
                <linearGradient key={b.id} id={b.id} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={b.sColor} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={b.dColor} stopOpacity={0.20} />
                </linearGradient>
              ))}
            </defs>

            <text x={0} y={PADDING_Y - 8} fill="#C2C7CE" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" textDecoration="none" style={{ textTransform: "uppercase" } as any}>
              {t("charts.sankeyEntries", "ENTRIES")}
            </text>
            <text x={svgW} y={PADDING_Y - 8} fill="#C2C7CE" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" textAnchor="end" style={{ textTransform: "uppercase" } as any}>
              {t("charts.sankeyExpenses", "EXPENSES")}
            </text>

            {bands.map((b) => {
              const cp1x = b.sx + (b.dx - b.sx) * 0.45;
              const cp2x = b.sx + (b.dx - b.sx) * 0.55;
              const top = `M${b.sx},${b.sy} C${cp1x},${b.sy} ${cp2x},${b.dy} ${b.dx},${b.dy}`;
              const bot = `L${b.dx},${b.dy + b.dh} C${cp2x},${b.dy + b.dh} ${cp1x},${b.sy + b.sh} ${b.sx},${b.sy + b.sh} Z`;
              return <path key={b.id} d={`${top} ${bot}`} fill={`url(#${b.id})`} />;
            })}

            {leftNodes.map((n, i) => (
              <g key={`l-${i}`}>
                <rect x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_RADIUS} fill={n.color} />
                <text x={n.x + BAR_W + 8} y={n.y + n.h / 2} fill="#414750" fontSize="11" fontWeight="500" fontFamily="Inter, sans-serif" dominantBaseline="middle">
                  {n.name}
                </text>
                <text x={n.x + BAR_W + 8} y={n.y + n.h / 2 + 13} fill="#9AA1AC" fontSize="11" fontWeight="400" fontFamily="Inter, sans-serif" dominantBaseline="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(n.value)}
                </text>
              </g>
            ))}

            {rightNodes.map((n, i) => (
              <g key={`r-${i}`}>
                <rect x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_RADIUS} fill={n.color} />
                <text x={n.x - 8} y={n.y + n.h / 2} fill="#414750" fontSize="11" fontWeight="500" fontFamily="Inter, sans-serif" dominantBaseline="middle" textAnchor="end">
                  {n.name}
                </text>
                <text x={n.x - 8} y={n.y + n.h / 2 + 13} fill="#9AA1AC" fontSize="11" fontWeight="400" fontFamily="Inter, sans-serif" dominantBaseline="middle" textAnchor="end" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {formatCurrency(n.value)}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
