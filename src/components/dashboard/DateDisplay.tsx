import { useTranslation } from "react-i18next";
import { CalendarDays, BarChart3 } from "lucide-react";

export type DashboardView = 'monthly' | 'total';

interface DateDisplayProps {
  currentView: DashboardView;
  onViewChange: (view: DashboardView) => void;
  hideToggle?: boolean;
}

export function DateDisplay({ currentView, onViewChange, hideToggle }: DateDisplayProps) {
  const { i18n, t } = useTranslation('dashboard');
  const today = new Date();
  
  const dayNumber = today.getDate();
  const dayName = today.toLocaleDateString(i18n.language, { weekday: 'short' });
  const monthName = today.toLocaleDateString(i18n.language, { month: 'long' });
  
  return (
    <div className="flex items-center gap-4">
      {/* Large day number in yellow circle */}
      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-warning/20 flex items-center justify-center">
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
      
      {!hideToggle && (
        <>
          {/* Divider */}
          <div className="hidden md:block w-px h-10 bg-border mx-2" />
          
          {/* View toggle */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => onViewChange('monthly')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-all ${
                currentView === 'monthly'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground/50 font-medium hover:text-foreground/70'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              {t('views.monthly', 'Monthly')}
            </button>
            <button
              onClick={() => onViewChange('total')}
              className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm transition-all ${
                currentView === 'total'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-foreground/50 font-medium hover:text-foreground/70'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              {t('views.total', 'Total')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
