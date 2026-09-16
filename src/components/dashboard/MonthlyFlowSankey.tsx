import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface AccountFlow {
  id: string;
  name: string;
  income: number;
  expenses: number;
}

interface MonthlyFlowSankeyProps {
  incomeCategories: CategoryData[];
  expenseCategories: CategoryData[];
  accountFlows: AccountFlow[];
  openingBalance?: number;
}

const BAR_W = 28;
const BAR_R = 5;
const SVG_W = 680;
const LEFT_X = 0;
const MID_X = 325;
const RIGHT_X = 652;
const GAP = 8;
const MIN_H = 8;
const TARGET_H = 268;

const MOBILE_SVG_W = 420;
const MOBILE_LEFT_X = 0;
const MOBILE_MID_X = 195;
const MOBILE_RIGHT_X = 390;
const MOBILE_TARGET_H = 340;

const ACCOUNT_COLORS = ["#1B76FF", "#4E97FF", "#8FBEFF", "#B6D4FF", "#D4E6FF"];

type Node = { name: string; value: number; color: string; x: number; y: number; h: number };
type Band = {
  sx: number; sy: number; sh: number;
  dx: number; dy: number; dh: number;
  sColor: string; dColor: string;
  id: string;
  srcCol: string; srcIdx: number;
  dstCol: string; dstIdx: number;
};

type HoveredNode = { column: "left" | "mid" | "right"; index: number } | null;

function buildColumn(items: Array<{ name: string; value: number; color: string }>, x: number, targetH = TARGET_H): Node[] {
  if (items.length === 0) return [];
  const total = items.reduce((s, it) => s + it.value, 0);
  if (total <= 0) return [];
  const gapTotal = (items.length - 1) * GAP;
  const barArea = targetH - gapTotal;
  let y = 0;
  return items.map((item) => {
    const h = Math.max(MIN_H, (item.value / total) * barArea);
    const node: Node = { ...item, x, y, h };
    y += h + GAP;
    return node;
  });
}

export function MonthlyFlowSankey({
  incomeCategories,
  expenseCategories,
  accountFlows,
  openingBalance = 0,
}: MonthlyFlowSankeyProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();
  const [hoveredNode, setHoveredNode] = useState<HoveredNode>(null);
  const [tooltipInfo, setTooltipInfo] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setIsMobile(entries[0].contentRect.width < 500);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const svgW = isMobile ? MOBILE_SVG_W : SVG_W;
  const leftX = isMobile ? MOBILE_LEFT_X : LEFT_X;
  const midX = isMobile ? MOBILE_MID_X : MID_X;
  const rightX = isMobile ? MOBILE_RIGHT_X : RIGHT_X;
  const targetH = isMobile ? MOBILE_TARGET_H : TARGET_H;

  const { leftNodes, midNodes, rightNodes, allBands } = useMemo(() => {
    const leftCats = incomeCategories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    const rightCats = expenseCategories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    const accounts = accountFlows.filter(a => a.income > 0 || a.expenses > 0);

    if (leftCats.length === 0 && rightCats.length === 0) {
      return { leftNodes: [], midNodes: [], rightNodes: [], allBands: [] };
    }

    const incomeTotal = leftCats.reduce((s, c) => s + c.value, 0);
    const expenseTotal = rightCats.reduce((s, c) => s + c.value, 0);

    const needsBalance = expenseTotal > incomeTotal && openingBalance > 0;
    const balanceValue = needsBalance ? Math.min(openingBalance, expenseTotal - incomeTotal) : 0;
    const finalLeft: CategoryData[] = needsBalance
      ? [...leftCats, { name: t("stats.openingBalance", "Opening balance"), value: balanceValue, color: "hsl(var(--muted-foreground))" }]
      : leftCats;

    let finalRight = rightCats;
    if (rightCats.length > 8) {
      const head = rightCats.slice(0, 7);
      const tail = rightCats.slice(7);
      const restVal = tail.reduce((s, c) => s + c.value, 0);
      const restLabel = t("charts.other", "Other");
      const existingOther = head.findIndex((c) => c.name === restLabel);
      if (existingOther >= 0) {
        finalRight = head.map((c, i) =>
          i === existingOther ? { ...c, value: c.value + restVal } : c,
        );
      } else {
        finalRight = [...head, { name: restLabel, value: restVal, color: "hsl(var(--muted-foreground) / 0.6)" }];
      }
    }

    const leftNodes = buildColumn(finalLeft, leftX, targetH);
    const midNodes = buildColumn(
      accounts.map((a, i) => ({
        name: a.name,
        value: Math.max(a.income, a.expenses),
        color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      })),
      midX,
      targetH,
    );
    const rightNodes = buildColumn(finalRight, rightX, targetH);

    const leftTotal = finalLeft.reduce((s, c) => s + c.value, 0);
    const accIncomeTotal = accounts.reduce((s, a) => s + a.income, 0);
    const accExpenseTotal = accounts.reduce((s, a) => s + a.expenses, 0);
    const rightTotal = finalRight.reduce((s, c) => s + c.value, 0);

    const bands: Band[] = [];

    if (midNodes.length > 0 && leftNodes.length > 0 && accIncomeTotal > 0 && leftTotal > 0) {
      const leftOffsets = leftNodes.map(() => 0);
      const midInOffsets = midNodes.map(() => 0);

      leftNodes.forEach((ln, li) => {
        midNodes.forEach((mn, mi) => {
          const acc = accounts[mi];
          if (!acc || acc.income <= 0) return;
          const incomeFrac = acc.income / accIncomeTotal;
          const sh = Math.max(0.5, incomeFrac * ln.h);
          const dh = Math.max(0.5, (ln.value / leftTotal) * mn.h);
          bands.push({
            sx: ln.x + BAR_W, sy: ln.y + leftOffsets[li], sh,
            dx: mn.x, dy: mn.y + midInOffsets[mi], dh,
            sColor: ln.color, dColor: mn.color,
            id: `lm-${li}-${mi}`,
            srcCol: "left", srcIdx: li,
            dstCol: "mid", dstIdx: mi,
          });
          leftOffsets[li] += sh;
          midInOffsets[mi] += dh;
        });
      });
    }

    if (midNodes.length > 0 && rightNodes.length > 0 && accExpenseTotal > 0 && rightTotal > 0) {
      const midOutOffsets = midNodes.map(() => 0);
      const rightOffsets = rightNodes.map(() => 0);

      midNodes.forEach((mn, mi) => {
        const acc = accounts[mi];
        if (!acc || acc.expenses <= 0) return;
        rightNodes.forEach((rn, ri) => {
          const expFrac = rn.value / rightTotal;
          const sh = Math.max(0.5, expFrac * mn.h);
          const dh = Math.max(0.5, (acc.expenses / accExpenseTotal) * rn.h);
          bands.push({
            sx: mn.x + BAR_W, sy: mn.y + midOutOffsets[mi], sh,
            dx: rn.x, dy: rn.y + rightOffsets[ri], dh,
            sColor: mn.color, dColor: rn.color,
            id: `mr-${mi}-${ri}`,
            srcCol: "mid", srcIdx: mi,
            dstCol: "right", dstIdx: ri,
          });
          midOutOffsets[mi] += sh;
          rightOffsets[ri] += dh;
        });
      });
    }

    return { leftNodes, midNodes, rightNodes, allBands: bands };
  }, [incomeCategories, expenseCategories, accountFlows, openingBalance, t, leftX, midX, rightX, targetH]);

  const connectedSet = useMemo(() => {
    if (!hoveredNode) return null;
    const bandIds = new Set<string>();
    const nodeKeys = new Set<string>();
    const { column, index } = hoveredNode;
    nodeKeys.add(`${column}-${index}`);

    for (const b of allBands) {
      if (column === "left" && b.srcCol === "left" && b.srcIdx === index) {
        bandIds.add(b.id);
        nodeKeys.add(`mid-${b.dstIdx}`);
      } else if (column === "right" && b.dstCol === "right" && b.dstIdx === index) {
        bandIds.add(b.id);
        nodeKeys.add(`mid-${b.srcIdx}`);
      } else if (column === "mid") {
        if ((b.srcCol === "left" && b.dstCol === "mid" && b.dstIdx === index) ||
            (b.srcCol === "mid" && b.srcIdx === index)) {
          bandIds.add(b.id);
          if (b.srcCol === "left") nodeKeys.add(`left-${b.srcIdx}`);
          if (b.dstCol === "right") nodeKeys.add(`right-${b.dstIdx}`);
        }
      }
    }
    return { bandIds, nodeKeys };
  }, [hoveredNode, allBands]);

  const isActive = hoveredNode !== null;

  const bandOpacity = useCallback((id: string) => {
    if (!isActive || !connectedSet) return 0.34;
    return connectedSet.bandIds.has(id) ? 0.55 : 0.04;
  }, [isActive, connectedSet]);

  const nodeOpacity = useCallback((col: string, idx: number) => {
    if (!isActive || !connectedSet) return 1;
    return connectedSet.nodeKeys.has(`${col}-${idx}`) ? 1 : 0.2;
  }, [isActive, connectedSet]);

  const textOpacity = useCallback((col: string, idx: number) => {
    if (!isActive || !connectedSet) return 1;
    return connectedSet.nodeKeys.has(`${col}-${idx}`) ? 1 : 0.15;
  }, [isActive, connectedSet]);

  const tooltipContent = useMemo(() => {
    if (!hoveredNode) return null;
    const { column, index } = hoveredNode;
    if (column === "left" && leftNodes[index]) {
      const n = leftNodes[index];
      const total = leftNodes.reduce((s, nd) => s + nd.value, 0);
      const pct = total > 0 ? Math.round((n.value / total) * 100) : 0;
      return { title: n.name, lines: [`${formatCurrency(n.value)} · ${pct}%`] };
    }
    if (column === "mid" && midNodes[index]) {
      const n = midNodes[index];
      const acc = accountFlows.filter(a => a.income > 0 || a.expenses > 0)[index];
      if (!acc) return { title: n.name, lines: [formatCurrency(n.value)] };
      return {
        title: n.name,
        lines: [
          `${t("stats.income", "Income")}: ${formatCurrency(acc.income)}`,
          `${t("stats.expenses", "Expenses")}: ${formatCurrency(acc.expenses)}`,
        ],
      };
    }
    if (column === "right" && rightNodes[index]) {
      const n = rightNodes[index];
      const total = rightNodes.reduce((s, nd) => s + nd.value, 0);
      const pct = total > 0 ? Math.round((n.value / total) * 100) : 0;
      return { title: n.name, lines: [`${formatCurrency(n.value)} · ${pct}%`] };
    }
    return null;
  }, [hoveredNode, leftNodes, midNodes, rightNodes, accountFlows, formatCurrency, t]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setTooltipInfo({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleNodeEnter = useCallback((column: "left" | "mid" | "right", index: number) => {
    setHoveredNode({ column, index });
  }, []);

  const handleNodeLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);

  const hasData = leftNodes.length > 0 || rightNodes.length > 0;
  const fontSize = isMobile ? 9 : 10;
  const labelMinH = 16;

  return (
    <div ref={containerRef} className="bg-card rounded-xl px-[14px] py-3 md:p-[16px_22px_20px] shadow-section h-full overflow-hidden flex flex-col">
      <p className="text-[14px] font-heading font-bold text-foreground mb-1">
        {t("charts.monthlyFlow", "Monthly flow")}
      </p>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div
          className="overflow-x-auto -mx-[14px] px-[14px] md:-mx-[22px] md:px-[22px] lg:mx-0 lg:px-0 relative"
          onMouseMove={handleMouseMove}
        >
          <div className="min-w-[520px] lg:min-w-0">
            <svg
              viewBox={`0 -32 ${svgW} ${targetH + 44}`}
              className="w-full select-none"
              preserveAspectRatio="xMidYMid meet"
              style={{ display: "block" }}
            >
              <defs>
                {allBands.map((b) => (
                  <linearGradient key={b.id} id={`sg-${b.id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={b.sColor} stopOpacity={1} />
                    <stop offset="100%" stopColor={b.dColor} stopOpacity={1} />
                  </linearGradient>
                ))}
              </defs>

              <text x={0} y={-14} textAnchor="start" fill="hsl(var(--muted-foreground) / 0.5)" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" style={{ textTransform: "uppercase" } as React.CSSProperties}>
                {t("charts.sankeyEntries", "ENTRIES")}
              </text>
              <text x={midX + BAR_W / 2} y={-14} textAnchor="middle" fill="hsl(var(--muted-foreground) / 0.5)" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" style={{ textTransform: "uppercase" } as React.CSSProperties}>
                {t("charts.accounts", "Accounts")}
              </text>
              <text x={svgW} y={-14} textAnchor="end" fill="hsl(var(--muted-foreground) / 0.5)" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" style={{ textTransform: "uppercase" } as React.CSSProperties}>
                {t("charts.sankeyExpenses", "EXPENSES")}
              </text>

              {allBands.map((b) => {
                const cp1x = b.sx + (b.dx - b.sx) * 0.4;
                const cp2x = b.sx + (b.dx - b.sx) * 0.6;
                const top = `M${b.sx},${b.sy} C${cp1x},${b.sy} ${cp2x},${b.dy} ${b.dx},${b.dy}`;
                const bot = `L${b.dx},${b.dy + b.dh} C${cp2x},${b.dy + b.dh} ${cp1x},${b.sy + b.sh} ${b.sx},${b.sy + b.sh} Z`;
                return (
                  <path
                    key={b.id}
                    d={`${top} ${bot}`}
                    fill={`url(#sg-${b.id})`}
                    opacity={bandOpacity(b.id)}
                    className="transition-opacity duration-200"
                  />
                );
              })}

              {leftNodes.map((n, i) => (
                <g
                  key={`l-${i}`}
                  onMouseEnter={() => handleNodeEnter("left", i)}
                  onMouseLeave={handleNodeLeave}
                  className="cursor-pointer"
                >
                  <rect
                    x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_R}
                    fill={n.color}
                    opacity={nodeOpacity("left", i)}
                    className="transition-opacity duration-200"
                  />
                  <rect x={n.x} y={n.y - 4} width={BAR_W + 120} height={n.h + 8} fill="transparent" />
                  {n.h >= labelMinH && (
                    <text
                      x={n.x + BAR_W + 10} y={n.y + n.h / 2}
                      dominantBaseline="middle" xmlSpace="preserve"
                      opacity={textOpacity("left", i)}
                      className="transition-opacity duration-200"
                      style={{ letterSpacing: 0 }}
                    >
                      <tspan fill="hsl(var(--foreground) / 0.8)" fontSize={fontSize} fontWeight="500" fontFamily="Inter, sans-serif">{n.name}</tspan>
                      <tspan> </tspan>
                      <tspan fill="hsl(var(--muted-foreground))" fontSize={fontSize} fontWeight="400" fontFamily="Inter, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(n.value)}</tspan>
                    </text>
                  )}
                </g>
              ))}

              {midNodes.map((n, i) => (
                <g
                  key={`m-${i}`}
                  onMouseEnter={() => handleNodeEnter("mid", i)}
                  onMouseLeave={handleNodeLeave}
                  className="cursor-pointer"
                >
                  <rect
                    x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_R}
                    fill={n.color}
                    opacity={nodeOpacity("mid", i)}
                    className="transition-opacity duration-200"
                  />
                  <rect x={n.x - 10} y={n.y - 4} width={BAR_W + 140} height={n.h + 8} fill="transparent" />
                  {n.h >= labelMinH && (
                    <text
                      x={n.x + BAR_W + 10} y={n.y + n.h / 2}
                      dominantBaseline="middle" xmlSpace="preserve"
                      opacity={textOpacity("mid", i)}
                      className="transition-opacity duration-200"
                      style={{ letterSpacing: 0 }}
                    >
                      <tspan fill="hsl(var(--foreground) / 0.8)" fontSize={fontSize} fontWeight="500" fontFamily="Inter, sans-serif">{n.name}</tspan>
                      <tspan> </tspan>
                      <tspan fill="hsl(var(--muted-foreground))" fontSize={fontSize} fontWeight="400" fontFamily="Inter, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(n.value)}</tspan>
                    </text>
                  )}
                </g>
              ))}

              {rightNodes.map((n, i) => (
                <g
                  key={`r-${i}`}
                  onMouseEnter={() => handleNodeEnter("right", i)}
                  onMouseLeave={handleNodeLeave}
                  className="cursor-pointer"
                >
                  <rect
                    x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_R}
                    fill={n.color}
                    opacity={nodeOpacity("right", i)}
                    className="transition-opacity duration-200"
                  />
                  <rect x={n.x - 120} y={n.y - 4} width={BAR_W + 120} height={n.h + 8} fill="transparent" />
                  {n.h >= labelMinH && (
                    <text
                      x={n.x - 10} y={n.y + n.h / 2}
                      dominantBaseline="middle" textAnchor="end" xmlSpace="preserve"
                      opacity={textOpacity("right", i)}
                      className="transition-opacity duration-200"
                      style={{ letterSpacing: 0 }}
                    >
                      <tspan fill="hsl(var(--muted-foreground))" fontSize={fontSize} fontWeight="400" fontFamily="Inter, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(n.value)}</tspan>
                      <tspan> </tspan>
                      <tspan fill="hsl(var(--foreground) / 0.8)" fontSize={fontSize} fontWeight="500" fontFamily="Inter, sans-serif">{n.name}</tspan>
                    </text>
                  )}
                </g>
              ))}
            </svg>
          </div>

          {hoveredNode && tooltipInfo && tooltipContent && (
            <div
              className="pointer-events-none absolute z-10 bg-card rounded-lg shadow-lg border border-border/50 px-3 py-2 min-w-[140px]"
              style={{
                left: Math.min(tooltipInfo.x + 14, (containerRef.current?.offsetWidth ?? 400) - 180),
                top: tooltipInfo.y - 10,
                transform: "translateY(-100%)",
              }}
            >
              <p className="text-[12px] font-semibold text-foreground mb-0.5">{tooltipContent.title}</p>
              {tooltipContent.lines.map((line, i) => (
                <p key={i} className="text-[11.5px] text-muted-foreground tabular-nums">{line}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
