import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  variant?: 'default' | 'primary';
  className?: string;
}

export function QuickActionCard({ 
  icon: Icon, 
  label, 
  onClick,
  variant = 'default',
  className
}: QuickActionCardProps) {
  return (
    <Card 
      variant="bento"
      className={cn(
        "cursor-pointer hover:scale-[1.02] transition-transform p-4 flex flex-col items-center justify-center gap-2 min-h-[100px]",
        variant === 'primary' && "bg-primary text-primary-foreground border-primary hover:bg-primary/90",
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center",
        variant === 'default' ? "bg-muted" : "bg-primary-foreground/20"
      )}>
        <Icon className={cn(
          "w-5 h-5",
          variant === 'default' ? "text-foreground" : "text-primary-foreground"
        )} />
      </div>
      <span className={cn(
        "text-xs font-medium text-center",
        variant === 'default' ? "text-muted-foreground" : "text-primary-foreground"
      )}>
        {label}
      </span>
    </Card>
  );
}
