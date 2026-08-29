import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { EmptyState } from "@/components/ui/empty-state";
import { useLocalization } from "@/hooks/useLocalization";
import type { DailyTotal } from "@/hooks/usePeriodAggregates";

interface DailyFlowChartProps {
  dailyTotals: DailyTotal[];
  monthKey: string | null;
  convert: (amount: number) => number;
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function DailyFlowChart({ dailyTotals, monthKey, convert }: DailyFlowChartProps) {
  const { t } = useTranslation("dashboard");
  const { formatCurrency } = useLocalization();

  const { points, monthName, netChange } = useMemo(() => {
    if (!monthKey) return { points: [], monthName: '', netChange: 0 };
    const [y, m] = monthKey.split("-").map(Number);
    if (!y || !m) return { points: [], monthName: '', netChange: 0 };
    const daysInMonth = new Date(y, m, 0).getDate();
    const name = MONTH_NAMES[m - 1] || monthKey;

    const dailyNet: Record<number, number> = {};
    for (const d of dailyTotals) {
      if (!d.day.startsWith(monthKey)) continue;
      const day = parseInt(d.day.slice(8, 10), 10);
      if (!day) continue;
      dailyNet[day] = (dailyNet[day] || 0) + convert(d.income) - convert(d.expenses);
    }

    let cumulative = 0;
    const pts = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      cumulative += dailyNet[day] || 0;
      return { day, label: `${MONTH_SHORT[m - 1]} ${day}`, balance: Math.round(cumulative * 100) / 100 };
    });

    return { points: pts, monthName: name, netChange: cumulative };
  }, [dailyTotals, monthKey, convert]);

  const hasData = points.some(p => p.balance !== 0);
  const isPositive = netChange >= 0;

  const tickDays = new Set([1, 8, 15, 22, points.length]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const { label, balance } = payload[0].payload;
    return (
      <div className="bg-card rounded-xl shadow-lg p-3 min-w-[150px]">
        <p className="text-xs text-[#9AA1AC] mb-1">{label}</p>
        <p className="text-sm font-semibold" style={{ color: balance >= 0 ? '#1B76FF' : 'hsl(var(--destructive))' }}>
          {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
        </p>
      </div>
    );
  };

  return (
    <div className="bg-card rounded-xl p-[20px_22px_16px] shadow-section">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[15px] font-heading font-bold text-foreground">
            {t('charts.dailyBalance', 'Daily balance')}
          </p>
          <p className="text-[12.5px] text-[#9AA1AC] mt-0.5">
            {t('charts.dailyBalanceSubtitle', 'How your balance moved through {{month}}', { month: monthName })}
          </p>
        </div>
        {hasData && (
          <span
            className="text-[13px] font-semibold whitespace-nowrap tabular-nums"
            style={{ color: isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))' }}
          >
            {isPositive ? '+' : ''}{formatCurrency(netChange)}
          </span>
        )}
      </div>

      {!hasData ? (
        <EmptyState height="h-[160px]" />
      ) : (
        <div className="h-[180px] md:h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1B76FF" stopOpacity={0.16} />
                  <stop offset="100%" stopColor="#1B76FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#F1F2F4" vertical={false} />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9AA1AC', fontSize: 11 }}
                tickFormatter={(d) => {
                  if (!monthKey) return '';
                  const [, m] = monthKey.split('-');
                  return tickDays.has(d) ? `${MONTH_SHORT[parseInt(m) - 1]} ${d}` : '';
                }}
                interval={0}
                dy={8}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1B76FF', strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#1B76FF"
                strokeWidth={2.2}
                fill="url(#balanceGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#1B76FF', strokeWidth: 0 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
