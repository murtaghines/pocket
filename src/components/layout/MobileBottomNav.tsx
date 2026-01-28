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
    },
    {
      path: '/investments',
      icon: PiggyBank,
      label: t('navigation.investments'),
    },
    {
      path: '/profile',
      icon: User,
      label: t('navigation.profile'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gradient-to-r from-violet-600 to-purple-700">
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
                  ? "bg-white/20" 
                  : "hover:bg-white/10 active:scale-95"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-colors",
                  active ? "text-white" : "text-white/70"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? "text-white" : "text-white/70"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0)] bg-gradient-to-r from-violet-600 to-purple-700" />
    </nav>
  );
}
