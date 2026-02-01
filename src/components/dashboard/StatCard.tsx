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
  invertChangeColor?: boolean;
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
  
  const isPositive = invertChangeColor ? rawNegative : rawPositive;
  const isNegative = invertChangeColor ? rawPositive : rawNegative;

  const getIconBgColor = () => {
    switch (type) {
      case 'income': return 'bg-success/10';
      case 'expense': return 'bg-destructive/10';
      case 'balance': return 'bg-primary/10';
      default: return 'bg-muted';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'income': return 'text-success';
      case 'expense': return 'text-destructive';
      case 'balance': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  const getValueColor = () => {
    switch (type) {
      case 'income': return 'text-success';
      case 'expense': return 'text-destructive';
      case 'balance': return 'text-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <Card 
      variant="bento"
      className="animate-slide-up overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="p-5">
        {/* Icon badge */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-4",
          getIconBgColor()
        )}>
          <div className={getIconColor()}>
            {icon}
          </div>
        </div>
        
        {/* Label */}
        <p className="text-sm font-medium text-muted-foreground mb-1">
          {title}
        </p>
        
        {/* Value */}
        <p className={cn(
          "text-2xl md:text-3xl font-bold tracking-tight font-display",
          getValueColor()
        )}>
          {value}
        </p>
        
        {/* Change indicator */}
        {change !== undefined && change !== null && (change !== 0 || isPositive || isNegative) && (
          <div className="flex items-center gap-1.5 mt-3">
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              isPositive && "bg-success/10 text-success",
              isNegative && "bg-destructive/10 text-destructive",
              !isPositive && !isNegative && "bg-muted text-muted-foreground"
            )}>
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
              <span>{rawPositive && "+"}{change}%</span>
            </div>
            {changeLabel && (
              <span className="text-xs text-muted-foreground">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
