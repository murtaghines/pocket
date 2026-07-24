import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";

interface DailyFlowChartProps {
  transactions: Array<{ date: string; amount: number; type: string; movement?: string }>;
  monthKey: string | null;
  convert: (amount: number) => number;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function DailyFlowChart({ transactions, monthKey, convert }: DailyFlowChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const { points, monthName, netChange } = useMemo(() => {
    if (!monthKey) return { points: [], monthName: '', netChange: 0 };
    const [y, m] = monthKey.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const name = MONTH_NAMES[m - 1] || monthKey;

    const dailyNet: Record<number, number> = {};
    transactions.forEach((tx) => {
      if (!tx.date.startsWith(monthKey)) return;
      const day = parseInt(tx.date.slice(8, 10), 10);
      if (!day) return;
      const isIncome = tx.type === "income" || tx.movement === "INCOME";
      const isExpense = tx.type === "expense" || tx.movement === "EXPENSE";
      const raw = Math.abs(convert(tx.amount));
      if (isIncome) dailyNet[day] = (dailyNet[day] || 0) + raw;
      else if (isExpense) dailyNet[day] = (dailyNet[day] || 0) - raw;
    });

    let cumulative = 0;
    const pts = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      cumulative += dailyNet[day] || 0;
      return { day, label: `${MONTH_SHORT[m - 1]} ${day}`, balance: Math.round(cumulative * 100) / 100 };
    });

    return { points: pts, monthName: name, netChange: cumulative };
  }, [transactions, monthKey, convert]);

  const hasData = points.some(p => p.balance !== 0);
  const isPositive = netChange >= 0;

  // Only tick every ~7 days to keep x-axis readable
  const tickDays = new Set([1, 8, 15, 22, points.length]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { label, balance } = payload[0].payload;
    return (
      <div className="bg-card border border-border/50 rounded-xl shadow-lg p-3 min-w-[150px]">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold" style={{ color: balance >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))' }}>
          {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
        </p>
      </div>
    );
  };

  return (
    <div
      className="bg-card rounded-2xl p-[20px_22px_18px]"
      style={{ boxShadow: "0 1px 3px rgba(13,30,70,.06)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-semibold text-foreground">
            {t('charts.dailyBalance', 'Daily balance')}
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t('charts.dailyBalanceSubtitle', 'How your balance moved through {{month}}', { month: monthName })}
          </p>
        </div>
        {hasData && (
          <span
            className="text-[13px] font-semibold whitespace-nowrap"
            style={{ color: isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
          >
            {isPositive ? '+' : ''}{formatCurrency(netChange)} this month
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[230px]" />
      ) : (
        <div className="h-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.35} vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(d) => {
                  if (!monthKey) return '';
                  const [, m] = monthKey.split('-');
                  return tickDays.has(d) ? `${MONTH_SHORT[parseInt(m) - 1]} ${d}` : '';
                }}
                interval={0}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v < -1000 ? `-${Math.abs(v / 1000).toFixed(0)}k` : `${Math.round(v)}`}
                width={38}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#balanceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
