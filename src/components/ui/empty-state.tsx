import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  message?: string;
  icon?: LucideIcon;
  height?: string;
  className?: string;
}

export function EmptyState({ 
  message, 
  icon: Icon, 
  height = "h-[200px]",
  className 
}: EmptyStateProps) {
  const { t } = useTranslation();
  
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2", height, className)}>
      {Icon && <Icon className="w-8 h-8 text-muted-foreground/50" />}
      <p className="text-sm text-muted-foreground">
        {message || t('common:noDataYet')}
      </p>
    </div>
  );
}
