import { useTranslation } from "react-i18next";
import { CalendarDays, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DashboardView = 'monthly' | 'total';

interface DateDisplayProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

export function DateDisplay({ currentView, onViewChange }: DateDisplayProps) {
  const { i18n, t } = useTranslation('dashboard');
  const today = new Date();
  
  const dayNumber = today.getDate();
  const dayName = today.toLocaleDateString(i18n.language, { weekday: 'short' });
  const monthName = today.toLocaleDateString(i18n.language, { month: 'long' });
  
  return (
    <div className="flex items-center gap-4 animate-fade-in">
      {/* Large day number in circle */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-muted flex items-center justify-center">
        <span className="text-2xl md:text-3xl font-bold text-foreground">
          {dayNumber}
        </span>
      </div>
      
      {/* Day and month */}
      <div className="flex flex-col">
        <span className="text-sm md:text-base font-medium text-foreground capitalize">
          {dayName},
        </span>
        <span className="text-sm md:text-base text-muted-foreground capitalize">
          {monthName}
        </span>
      </div>
      
      {/* Divider */}
      <div className="hidden md:block w-px h-10 bg-border mx-2" />
      
      {/* View toggle - same pattern as ProfileHeader tabs */}
      <div className="hidden md:flex items-center gap-3">
        {currentView === 'monthly' ? (
          <>
            <Button variant="default" className="rounded-full gap-2 px-5">
              <CalendarDays className="w-4 h-4" />
              {t('views.monthly', 'Monthly')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-muted hover:bg-muted/80"
              onClick={() => onViewChange('total')}
            >
              <BarChart3 className="w-4 h-4 text-foreground" />
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-muted hover:bg-muted/80"
              onClick={() => onViewChange('monthly')}
            >
              <CalendarDays className="w-4 h-4 text-foreground" />
            </Button>
            <Button variant="default" className="rounded-full gap-2 px-5">
              <BarChart3 className="w-4 h-4" />
              {t('views.total', 'Total')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
