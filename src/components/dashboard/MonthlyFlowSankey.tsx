import { useMemo } from "react";
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

const BAR_W = 30;
const BAR_R = 7;
const SVG_W = 680;
const LEFT_X = 0;
const MID_X = 325;
const RIGHT_X = 650;
const GAP = 6;
const MIN_H = 6;

const ACCOUNT_COLORS = ["#1B76FF", "#4E97FF", "#8FBEFF", "#B6D4FF", "#D4E6FF"];

export function MonthlyFlowSankey({
  incomeCategories,
  expenseCategories,
  accountFlows,
  openingBalance = 0,
}: MonthlyFlowSankeyProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const { leftNodes, midNodes, rightNodes, leftMidBands, midRightBands, svgH } = useMemo(() => {
    const leftCats = incomeCategories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    const rightCats = expenseCategories.filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
    const accounts = accountFlows.filter(a => a.income > 0 || a.expenses > 0);

    if (leftCats.length === 0 && rightCats.length === 0) {
      return { leftNodes: [], midNodes: [], rightNodes: [], leftMidBands: [], midRightBands: [], svgH: 200 };
    }

    const incomeTotal = leftCats.reduce((s, c) => s + c.value, 0);
    const expenseTotal = rightCats.reduce((s, c) => s + c.value, 0);
    const accountIncomeTotal = accounts.reduce((s, a) => s + a.income, 0);
    const accountExpenseTotal = accounts.reduce((s, a) => s + a.expenses, 0);

    const needsBalance = expenseTotal > incomeTotal && openingBalance > 0;
    const balanceValue = needsBalance ? Math.min(openingBalance, expenseTotal - incomeTotal) : 0;
    const finalLeft = needsBalance
      ? [...leftCats, { name: t("stats.openingBalance", "Opening balance"), value: balanceValue, color: "#8A919C" }]
      : leftCats;

    const topN = 4;
    let finalRight = rightCats;
    if (rightCats.length > topN) {
      const head = rightCats.slice(0, topN);
      const tail = rightCats.slice(topN);
      const restVal = tail.reduce((s, c) => s + c.value, 0);
      finalRight = [...head, { name: t("charts.other", "Other"), value: restVal, color: "#B4BAC3" }];
    }

    const leftTotal = finalLeft.reduce((s, c) => s + c.value, 0);
    const rightTotal = finalRight.reduce((s, c) => s + c.value, 0);
    const midTotal = Math.max(
      accounts.reduce((s, a) => s + a.income, 0),
      accounts.reduce((s, a) => s + a.expenses, 0),
      leftTotal,
      rightTotal,
    );

    const maxTotal = Math.max(leftTotal, midTotal, rightTotal);
    if (maxTotal === 0) return { leftNodes: [], midNodes: [], rightNodes: [], leftMidBands: [], midRightBands: [], svgH: 200 };

    const maxNodes = Math.max(finalLeft.length, accounts.length, finalRight.length);
    const availableH = Math.max(200, maxNodes * 32 + (maxNodes - 1) * GAP);
    const scale = (availableH - (Math.max(finalLeft.length, accounts.length, finalRight.length) - 1) * GAP) / maxTotal;

    type Node = { name: string; value: number; color: string; x: number; y: number; h: number };

    const buildNodes = (items: Array<{ name: string; value: number; color: string }>, x: number): Node[] => {
      let y = 0;
      return items.map((item) => {
        const h = Math.max(MIN_H, item.value * scale);
        const node = { ...item, x, y, h };
        y += h + GAP;
        return node;
      });
    };

    const leftNodes = buildNodes(finalLeft, LEFT_X);
    const midNodes = buildNodes(
      accounts.map((a, i) => ({
        name: a.name,
        value: Math.max(a.income, a.expenses),
        color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      })),
      MID_X,
    );
    const rightNodes = buildNodes(finalRight, RIGHT_X);

    type Band = {
      sx: number; sy: number; sh: number;
      dx: number; dy: number; dh: number;
      sColor: string; dColor: string;
      id: string;
    };

    const leftMidBands: Band[] = [];
    if (midNodes.length > 0 && leftNodes.length > 0) {
      const midOffsets = midNodes.map(() => 0);
      leftNodes.forEach((ln, li) => {
        let leftOffset = 0;
        midNodes.forEach((mn, mi) => {
          const acc = accounts[mi];
          const flow = (ln.value / leftTotal) * acc.income;
          if (flow <= 0) return;
          const sh = Math.max(1, (flow / ln.value) * ln.h);
          const dh = Math.max(1, (flow / mn.value) * mn.h);
          leftMidBands.push({
            sx: ln.x + BAR_W, sy: ln.y + leftOffset, sh,
            dx: mn.x, dy: mn.y + midOffsets[mi], dh,
            sColor: ln.color, dColor: mn.color,
            id: `lm-${li}-${mi}`,
          });
          leftOffset += sh;
          midOffsets[mi] += dh;
        });
      });
    }

    const midRightBands: Band[] = [];
    if (midNodes.length > 0 && rightNodes.length > 0) {
      const rightOffsets = rightNodes.map(() => 0);
      midNodes.forEach((mn, mi) => {
        let midOffset = midNodes.length > 0
          ? leftMidBands.filter(b => b.dx === mn.x).reduce((max, b) => Math.max(max, b.dy + b.dh - mn.y), 0)
          : 0;
        rightNodes.forEach((rn, ri) => {
          const acc = accounts[mi];
          const flow = (acc.expenses / (accountExpenseTotal || 1)) * rn.value;
          if (flow <= 0) return;
          const sh = Math.max(1, (flow / mn.value) * mn.h);
          const dh = Math.max(1, (flow / rn.value) * rn.h);
          midRightBands.push({
            sx: mn.x + BAR_W, sy: mn.y + midOffset, sh,
            dx: rn.x, dy: rn.y + rightOffsets[ri], dh,
            sColor: mn.color, dColor: rn.color,
            id: `mr-${mi}-${ri}`,
          });
          midOffset += sh;
          rightOffsets[ri] += dh;
        });
      });
    }

    const totalH = Math.max(
      leftNodes.length > 0 ? leftNodes[leftNodes.length - 1].y + leftNodes[leftNodes.length - 1].h : 0,
      midNodes.length > 0 ? midNodes[midNodes.length - 1].y + midNodes[midNodes.length - 1].h : 0,
      rightNodes.length > 0 ? rightNodes[rightNodes.length - 1].y + rightNodes[rightNodes.length - 1].h : 0,
    );

    return { leftNodes, midNodes, rightNodes, leftMidBands, midRightBands, svgH: totalH };
  }, [incomeCategories, expenseCategories, accountFlows, openingBalance, t]);

  const allBands = [...leftMidBands, ...midRightBands];
  const hasData = leftNodes.length > 0 || rightNodes.length > 0;

  return (
    <div className="bg-card rounded-xl p-[20px_22px_18px] shadow-section h-full">
      <p className="text-[15px] font-heading font-semibold text-foreground mb-1">
        {t("charts.monthlyFlow", "Monthly flow")}
      </p>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div className="overflow-x-auto pt-0">
          <svg
            viewBox={`0 -32 ${SVG_W} ${svgH + 44}`}
            className="w-full"
            preserveAspectRatio="xMidYMid meet"
            style={{ display: "block" }}
          >
            <defs>
              {allBands.map((b) => (
                <linearGradient key={b.id} id={b.id} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={b.sColor} stopOpacity={0.34} />
                  <stop offset="100%" stopColor={b.dColor} stopOpacity={0.20} />
                </linearGradient>
              ))}
            </defs>

            <text x={0} y={-14} textAnchor="start" fill="#C2C7CE" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" style={{ textTransform: "uppercase" } as React.CSSProperties}>
              {t("charts.sankeyEntries", "ENTRIES")}
            </text>
            <text x={MID_X + BAR_W / 2} y={-14} textAnchor="middle" fill="#C2C7CE" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" style={{ textTransform: "uppercase" } as React.CSSProperties}>
              {t("charts.accounts", "Accounts")}
            </text>
            <text x={SVG_W} y={-14} textAnchor="end" fill="#C2C7CE" fontSize="10.5" fontWeight="500" fontFamily="Inter, sans-serif" letterSpacing=".06em" style={{ textTransform: "uppercase" } as React.CSSProperties}>
              {t("charts.sankeyExpenses", "EXPENSES")}
            </text>

            {allBands.map((b) => {
              const cp1x = b.sx + (b.dx - b.sx) * 0.45;
              const cp2x = b.sx + (b.dx - b.sx) * 0.55;
              const top = `M${b.sx},${b.sy} C${cp1x},${b.sy} ${cp2x},${b.dy} ${b.dx},${b.dy}`;
              const bot = `L${b.dx},${b.dy + b.dh} C${cp2x},${b.dy + b.dh} ${cp1x},${b.sy + b.sh} ${b.sx},${b.sy + b.sh} Z`;
              return <path key={b.id} d={`${top} ${bot}`} fill={`url(#${b.id})`} />;
            })}

            {leftNodes.map((n, i) => (
              <g key={`l-${i}`}>
                <rect x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_R} fill={n.color} />
                <text x={n.x + BAR_W + 10} y={n.y + n.h / 2} dominantBaseline="middle" xmlSpace="preserve" style={{ letterSpacing: 0 }}>
                  <tspan fill="#414750" fontSize="11" fontWeight="500" fontFamily="Inter, sans-serif">{n.name}</tspan>
                  <tspan> </tspan>
                  <tspan fill="#9AA1AC" fontSize="11" fontWeight="400" fontFamily="Inter, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(n.value)}</tspan>
                </text>
              </g>
            ))}

            {midNodes.map((n, i) => (
              <g key={`m-${i}`}>
                <rect x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_R} fill={n.color} />
                <text x={n.x + BAR_W + 10} y={n.y + n.h / 2} dominantBaseline="middle" xmlSpace="preserve" style={{ letterSpacing: 0 }}>
                  <tspan fill="#414750" fontSize="11" fontWeight="500" fontFamily="Inter, sans-serif">{n.name}</tspan>
                  <tspan> </tspan>
                  <tspan fill="#9AA1AC" fontSize="11" fontWeight="400" fontFamily="Inter, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(n.value)}</tspan>
                </text>
              </g>
            ))}

            {rightNodes.map((n, i) => (
              <g key={`r-${i}`}>
                <rect x={n.x} y={n.y} width={BAR_W} height={n.h} rx={BAR_R} fill={n.color} />
                <text x={n.x - 10} y={n.y + n.h / 2} dominantBaseline="middle" textAnchor="end" xmlSpace="preserve" style={{ letterSpacing: 0 }}>
                  <tspan fill="#9AA1AC" fontSize="11" fontWeight="400" fontFamily="Inter, sans-serif" style={{ fontVariantNumeric: "tabular-nums" }}>{formatCurrency(n.value)}</tspan>
                  <tspan> </tspan>
                  <tspan fill="#414750" fontSize="11" fontWeight="500" fontFamily="Inter, sans-serif">{n.name}</tspan>
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}
    </div>
  );
}
