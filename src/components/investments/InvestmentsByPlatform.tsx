import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PlatformData {
  deposits: number;
  withdrawals: number;
  net: number;
}

interface InvestmentsByPlatformProps {
  data: Record<string, PlatformData>;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#84CC16'];

export function InvestmentsByPlatform({ data }: InvestmentsByPlatformProps) {
  const chartData = Object.entries(data)
    .map(([name, values], index) => ({
      name,
      value: values.net,
      deposits: values.deposits,
      withdrawals: values.withdrawals,
      color: COLORS[index % COLORS.length],
    }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('en-US', { style: 'currency', currency: 'EUR' });

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>By Platform</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[200px]">
          <p className="text-muted-foreground">No data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => [
                formatCurrency(value),
                props.payload.name
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}