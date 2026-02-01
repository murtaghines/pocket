import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TrendingUp } from "lucide-react";

interface SavingsRateCardProps {
  income: number;
  expenses: number;
  delay?: number;
}

export function SavingsRateCard({ income, expenses, delay = 0 }: SavingsRateCardProps) {
  const { t } = useTranslation('dashboard');
  const hasData = income > 0 || expenses > 0;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (Math.max(0, savingsRate) / 100) * circumference;
  
  const getStrokeColor = () => {
    if (savingsRate <= 0) return 'hsl(var(--muted-foreground))';
    if (savingsRate >= 30) return 'hsl(var(--success))';
    if (savingsRate >= 15) return 'hsl(var(--warning))';
    return 'hsl(var(--primary))';
  };

  const getTextColor = () => {
    if (savingsRate <= 0) return 'text-muted-foreground';
    if (savingsRate >= 30) return 'text-success';
    if (savingsRate >= 15) return 'text-warning';
    return 'text-primary';
  };

  const getRatingLabel = () => {
    if (savingsRate <= 0) return '-';
    if (savingsRate >= 30) return t('stats.excellent', { defaultValue: 'Excellent' });
    if (savingsRate >= 15) return t('stats.good', { defaultValue: 'Good' });
    return t('stats.needsImprovement', { defaultValue: 'Needs improvement' });
  };

  if (!hasData) {
    return (
      <Card variant="bento" className="animate-slide-up" style={{ animationDelay: `${delay}ms` }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            {t('stats.savingsRate')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <EmptyState height="min-h-[160px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      variant="bento"
      className="animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          {t('stats.savingsRate')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center pt-2">
        {/* Ring progress */}
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            {/* Background ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="hsl(var(--muted))"
              strokeWidth="6"
            />
            {/* Progress ring */}
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={getStrokeColor()}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference}
              className="transition-all duration-1000 ease-out"
              style={{
                animation: 'draw-ring 1.5s ease-out forwards',
              }}
            />
          </svg>
          {/* Center content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${getTextColor()}`}>
              {savingsRate}%
            </span>
          </div>
        </div>
        
        {/* Rating label */}
        <p className="text-sm text-muted-foreground mt-3 text-center">
          {getRatingLabel()}
        </p>
      </CardContent>
      <style>{`
        @keyframes draw-ring {
          to {
            stroke-dashoffset: ${strokeDashoffset};
          }
        }
      `}</style>
    </Card>
  );
}
