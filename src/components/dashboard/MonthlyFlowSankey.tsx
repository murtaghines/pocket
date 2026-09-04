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
const BAR_R = 0;
const SVG_W = 680;
const LEFT_X = 0;
const MID_X = 325;
const RIGHT_X = 650;
const GAP = 8;
const MIN_H = 8;
const TARGET_H = 268;

const ACCOUNT_COLORS = ["#1B76FF", "#4E97FF", "#8FBEFF", "#B6D4FF", "#D4E6FF"];

type Node = { name: string; value: number; color: string; x: number; y: number; h: number };
type Band = {
  sx: number; sy: number; sh: number;
  dx: number; dy: number; dh: number;
  sColor: string; dColor: string;
  id: string;
};

function buildColumn(items: Array<{ name: string; value: number; color: string }>, x: number): Node[] {
  if (items.length === 0) return [];
  const total = items.reduce((s, it) => s + it.value, 0);
  if (total <= 0) return [];
  const gapTotal = (items.length - 1) * GAP;
  const barArea = TARGET_H - gapTotal;
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
      ? [...leftCats, { name: t("stats.openingBalance", "Opening balance"), value: balanceValue, color: "#8A919C" }]
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
        finalRight = [...head, { name: restLabel, value: restVal, color: "#B4BAC3" }];
      }
    }

    const leftNodes = buildColumn(finalLeft, LEFT_X);
    const midNodes = buildColumn(
      accounts.map((a, i) => ({
        name: a.name,
        value: Math.max(a.income, a.expenses),
        color: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
      })),
      MID_X,
    );
    const rightNodes = buildColumn(finalRight, RIGHT_X);

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
          });
          midOutOffsets[mi] += sh;
          rightOffsets[ri] += dh;
        });
      });
    }

    return { leftNodes, midNodes, rightNodes, allBands: bands };
  }, [incomeCategories, expenseCategories, accountFlows, openingBalance, t]);

  const hasData = leftNodes.length > 0 || rightNodes.length > 0;

  return (
    <div className="bg-card rounded-xl p-[20px_22px_18px] shadow-section h-full">
      <p className="text-[15px] font-heading font-bold text-foreground mb-1">
        {t("charts.monthlyFlow", "Monthly flow")}
      </p>

      {!hasData ? (
        <EmptyState height="h-[200px]" />
      ) : (
        <div className="overflow-x-auto -mx-[22px] px-[22px] lg:mx-0 lg:px-0">
          <div className="min-w-[520px] lg:min-w-0">
          <svg
            viewBox={`0 -32 ${SVG_W} ${TARGET_H + 44}`}
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
        </div>
      )}
    </div>
  );
}
