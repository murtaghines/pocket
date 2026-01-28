import { LayoutDashboard, PiggyBank, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation('common');

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    {
      path: '/',
      icon: LayoutDashboard,
      label: t('navigation.dashboard'),
      activeColor: 'text-primary',
    },
    {
      path: '/investments',
      icon: PiggyBank,
      label: t('navigation.investments'),
      activeColor: 'text-purple-600',
    },
    {
      path: '/profile',
      icon: User,
      label: t('navigation.profile'),
      activeColor: 'text-primary',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 min-w-[72px]",
                active 
                  ? "bg-primary/10" 
                  : "hover:bg-muted active:scale-95"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-colors",
                  active ? item.activeColor : "text-muted-foreground"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? item.activeColor : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
