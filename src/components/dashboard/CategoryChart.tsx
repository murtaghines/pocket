import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

interface CategoryChartProps {
  data: CategoryData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="font-medium text-foreground">{payload[0].name}</p>
        <p className="text-sm text-muted-foreground">
          {payload[0].value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="grid grid-cols-2 gap-2 mt-4">
      {payload?.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground truncate">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function CategoryChart({ data }: CategoryChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
      <CardHeader>
        <CardTitle className="text-lg">Gastos por Categoría</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    className="transition-all duration-200 hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="text-center mt-2">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-display font-bold">
            {total.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
