import { LayoutDashboard, PiggyBank, Home, Upload, Settings } from "lucide-react";
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

  // Profile page navigation items
  const profileNavItems = [
    {
      type: 'link' as const,
      path: '/',
      icon: Home,
      label: t('navigation.home'),
    },
    {
      type: 'tab' as const,
      tabId: 'data',
      icon: Upload,
      label: tp('tabs.data'),
    },
    {
      type: 'tab' as const,
      tabId: 'settings',
      icon: Settings,
      label: tp('tabs.settings'),
    },
  ];

  // Default navigation items
  const defaultNavItems = [
    {
      type: 'link' as const,
      path: '/',
      icon: LayoutDashboard,
      label: t('navigation.dashboard'),
    },
    {
      type: 'link' as const,
      path: '/investments',
      icon: PiggyBank,
      label: t('navigation.investments'),
    },
  ];

  const navItems = isProfilePage ? profileNavItems : defaultNavItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-primary">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          
          if (item.type === 'link') {
            const active = location.pathname === item.path;
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
          } else {
            const active = currentTab === item.tabId;
            return (
              <button
                key={item.tabId}
                onClick={() => handleTabChange(item.tabId)}
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
              </button>
            );
          }
        })}
      </div>
      {/* Safe area padding for devices with home indicator */}
      <div className="h-[env(safe-area-inset-bottom,0)] bg-primary" />
    </nav>
  );
}
