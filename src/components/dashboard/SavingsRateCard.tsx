import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { PiggyBank } from "lucide-react";

interface SavingsRateCardProps {
  income: number;
  expenses: number;
  delay?: number;
}

export function SavingsRateCard({ income, expenses, delay = 0 }: SavingsRateCardProps) {
  const { t } = useTranslation('dashboard');
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (savingsRate / 100) * circumference;
  
  const getColor = () => {
    if (savingsRate >= 30) return 'text-success';
    if (savingsRate >= 15) return 'text-warning';
    return 'text-destructive';
  };

  const getStrokeColor = () => {
    if (savingsRate >= 30) return 'hsl(var(--success))';
    if (savingsRate >= 15) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const getRatingLabel = () => {
    if (savingsRate >= 30) return t('stats.excellent', { defaultValue: 'Excellent' });
    if (savingsRate >= 15) return t('stats.good', { defaultValue: 'Good' });
    return t('stats.needsImprovement', { defaultValue: 'Needs improvement' });
  };

  return (
    <Card 
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-6 flex flex-col items-center justify-center h-full">
        <div className="relative w-28 h-28">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={getStrokeColor()}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{ 
                animation: 'draw-circle 1.5s ease-out forwards',
                strokeDashoffset: circumference,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${getColor()}`}>
              {savingsRate}%
            </span>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <PiggyBank className="w-4 h-4 text-muted-foreground" />
            {t('stats.savingsRate')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {getRatingLabel()}
          </p>
        </div>
      </CardContent>
      <style>{`
        @keyframes draw-circle {
          to {
            stroke-dashoffset: ${strokeDashoffset};
          }
        }
      `}</style>
    </Card>
  );
}
