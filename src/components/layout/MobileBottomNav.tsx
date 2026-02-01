import { LayoutDashboard, PiggyBank, Upload, Settings } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export function MobileBottomNav() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation('common');
  const { t: tp } = useTranslation('profile');

  const isProfilePage = location.pathname === '/profile';
  const currentTab = searchParams.get('tab') || 'data';

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  // Profile page navigation items - only 2 tabs
  const profileNavItems = [
    {
      tabId: 'data',
      icon: Upload,
      label: tp('tabs.data'),
    },
    {
      tabId: 'settings',
      icon: Settings,
      label: tp('tabs.settings'),
    },
  ];

  // Default navigation items
  const defaultNavItems = [
    {
      path: '/dashboard',
      icon: LayoutDashboard,
      label: t('navigation.dashboard'),
    },
    {
      path: '/investments',
      icon: PiggyBank,
      label: t('navigation.investments'),
    },
  ];

  if (isProfilePage) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border">
        <div className="flex items-center justify-around h-16 px-4">
          {profileNavItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.tabId;
            
            return (
              <button
                key={item.tabId}
                onClick={() => handleTabChange(item.tabId)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-xl transition-all duration-200 flex-1 max-w-[140px]",
                  active 
                    ? "bg-primary/10" 
                    : "hover:bg-muted active:scale-95"
                )}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )} 
                />
                <span 
                  className={cn(
                    "text-xs font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        {/* Safe area padding for devices with home indicator */}
        <div className="h-[env(safe-area-inset-bottom,0)] bg-background" />
      </nav>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border">
      <div className="flex items-center justify-around h-16 px-4">
        {defaultNavItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-6 py-2 rounded-xl transition-all duration-200 flex-1 max-w-[140px]",
                active 
                  ? "bg-primary/10" 
                  : "hover:bg-muted active:scale-95"
              )}
            >
              <Icon 
                className={cn(
                  "w-5 h-5 transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )} 
              />
              <span 
                className={cn(
                  "text-xs font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0)] bg-background" />
    </nav>
  );
}
