import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CreditCard } from "lucide-react";

interface BankData {
  name: string;
  value: number;
}

interface BankDistributionChartProps {
  data: BankData[];
}

const BANK_COLORS: Record<string, string> = {
  'Santander': 'hsl(0, 100%, 45%)',
  'Revolut': 'hsl(270, 60%, 50%)',
  'BBVA': 'hsl(210, 100%, 30%)',
  'CaixaBank': 'hsl(195, 100%, 35%)',
};

const DEFAULT_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
];

export function BankDistributionChart({ data }: BankDistributionChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatCurrency(item.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="animate-slide-up flex-1" style={{ animationDelay: '400ms' }}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Gastos por Banco
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-24 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={42}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={BANK_COLORS[entry.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-sm font-bold">{formatCurrency(total)}</span>
              <span className="text-[9px] text-muted-foreground">Total</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-1.5">
            {data.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(0);
              const color = BANK_COLORS[item.name] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-muted-foreground">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
