import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  previousValue?: string;
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
  previousValue,
  type = 'neutral',
  icon,
  delay = 0,
  invertChangeColor = false
}: StatCardProps) {
  const rawPositive = change && change > 0;
  const rawNegative = change && change < 0;
  
  // Color: inverted for expenses (up = bad/red, down = good/green)
  const isColorPositive = invertChangeColor ? rawNegative : rawPositive;
  const isColorNegative = invertChangeColor ? rawPositive : rawNegative;

  // Balance card gets special blue background treatment
  const isBalanceCard = type === 'balance';

  const getIconBgColor = () => {
    if (isBalanceCard) return 'bg-primary/10';
    switch (type) {
      case 'income': return 'bg-success/10';
      case 'expense': return 'bg-destructive/10';
      default: return 'bg-primary/10';
    }
  };

  const getIconColor = () => {
    if (isBalanceCard) return 'text-primary';
    switch (type) {
      case 'income': return 'text-success';
      case 'expense': return 'text-destructive';
      default: return 'text-primary';
    }
  };

  const getValueColor = () => {
    if (isBalanceCard) return 'text-primary';
    switch (type) {
      case 'income': return 'text-success';
      case 'expense': return 'text-destructive';
      default: return 'text-foreground';
    }
  };

  return (
    <Card 
      variant="bento"
      className={cn(
        "overflow-hidden relative",
        isBalanceCard && "border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10"
      )}
    >
      <div className="p-4 md:p-5 relative">
        {/* Icon badge */}
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
          getIconBgColor()
        )}>
          <div className={getIconColor()}>
            {icon}
          </div>
        </div>
        
        {/* Label */}
        <p className={cn(
          "text-xs font-medium mb-1 uppercase tracking-wide",
          isBalanceCard ? "text-primary/70" : "text-muted-foreground"
        )}>
          {title}
        </p>
        
        {/* Value - larger and bolder */}
        <p className={cn(
          "text-xl md:text-2xl font-bold tracking-tight",
          isBalanceCard && "bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
          !isBalanceCard && getValueColor()
        )}>
          {value}
        </p>
        
        {/* Change indicator - more compact */}
        {change !== undefined && change !== null && (change !== 0 || rawPositive || rawNegative) && (
          <div className="flex items-center gap-1.5 mt-2">
            <div className={cn(
              "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium",
              isBalanceCard && "bg-primary/10 text-primary",
              !isBalanceCard && isColorPositive && "bg-success/10 text-success",
              !isBalanceCard && isColorNegative && "bg-destructive/10 text-destructive",
              !isBalanceCard && !isColorPositive && !isColorNegative && "bg-muted text-muted-foreground"
            )}>
              {rawPositive && <ArrowUp className="w-3 h-3" />}
              {rawNegative && <ArrowDown className="w-3 h-3" />}
              {!rawPositive && !rawNegative && <Minus className="w-3 h-3" />}
              <span>{Math.abs(change)}%</span>
            </div>
            {previousValue && (
              <span className={cn(
                "text-xs",
                isBalanceCard ? "text-primary/60" : "text-muted-foreground"
              )}>
                previous: {previousValue}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
