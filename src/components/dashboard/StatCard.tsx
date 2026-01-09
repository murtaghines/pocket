import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  type?: 'income' | 'expense' | 'neutral' | 'balance';
  icon?: React.ReactNode;
  delay?: number;
  invertChangeColor?: boolean; // For expenses: increase is bad (red)
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeLabel,
  type = 'neutral',
  icon,
  delay = 0,
  invertChangeColor = false
}: StatCardProps) {
  const rawPositive = change && change > 0;
  const rawNegative = change && change < 0;
  
  // For expenses, invert the color logic (increase is bad)
  const isPositive = invertChangeColor ? rawNegative : rawPositive;
  const isNegative = invertChangeColor ? rawPositive : rawNegative;

  // For balance type, use neutral card styling
  const cardVariant = type === 'balance' ? 'neutral' : type;

  return (
    <Card 
      variant={cardVariant}
      className={cn(
        "animate-slide-up",
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon && (
            <div className={cn(
              "p-2 rounded-lg",
              type === 'income' && "bg-success/20 text-success",
              type === 'expense' && "bg-destructive/20 text-destructive",
              (type === 'neutral' || type === 'balance') && "bg-muted text-muted-foreground",
            )}>
              {icon}
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <p className={cn(
            "text-3xl font-display font-bold tracking-tight",
            type === 'income' && "text-success",
            type === 'expense' && "text-destructive",
            type === 'balance' && "text-muted-foreground",
          )}>
            {value}
          </p>
          
          {change !== undefined && change !== null && (
            // Only show comparison if there's actual change data (not 0 with no previous data)
            (change !== 0 || isPositive || isNegative) ? (
              <div className="flex items-center gap-1.5 text-sm">
                {isPositive && <TrendingUp className="w-4 h-4 text-success" />}
                {isNegative && <TrendingDown className="w-4 h-4 text-destructive" />}
                {!isPositive && !isNegative && <Minus className="w-4 h-4 text-muted-foreground" />}
                <span className={cn(
                  "font-medium",
                  isPositive && "text-success",
                  isNegative && "text-destructive",
                  !isPositive && !isNegative && "text-muted-foreground",
                )}>
                  {rawPositive && "+"}
                  {change}%
                </span>
                {changeLabel && (
                  <span className="text-muted-foreground">{changeLabel}</span>
                )}
              </div>
            ) : null
          )}
        </div>
      </div>
    </Card>
  );
}
