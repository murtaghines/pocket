import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PiggyBank, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { CurrencySelector } from "./CurrencySelector";
import { NotificationBell } from "./NotificationBell";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";


interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const { t } = useTranslation('common');
  
  const isActive = (path: string) => location.pathname === path;

  const getInitials = () => {
    if (profile?.first_name) {
      const first = profile.first_name.charAt(0).toUpperCase();
      const last = profile.last_name?.charAt(0).toUpperCase() || '';
      return first + last;
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const navItems = [
    { label: t('navigation.dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { label: t('navigation.investments'), path: '/investments', icon: PiggyBank },
    { label: t('navigation.profile'), path: '/profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-background dashboard-theme">
      {/* Floating top nav bar - dark blue */}
      <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center justify-between backdrop-blur-xl rounded-full px-4 md:px-6 py-2.5 shadow-sm" style={{ background: '#0F4264' }}>
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
              <img src={pocketLogoWhite} alt="pocket" className="h-5 w-auto" />
            </Link>

            {/* Center Navigation - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-full text-sm transition-all",
                      isActive(item.path)
                        ? "text-white font-bold"
                        : "text-white/60 hover:text-white hover:bg-white/10 font-medium"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side: Currency + Notifications + Avatar */}
            <div className="flex items-center gap-2">
              <CurrencySelector variant="light" />
              <NotificationBell variant="light" />
              <Link to="/profile" className="hidden md:block">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  isActive('/profile')
                    ? "bg-white text-[#0F4264]"
                    : "bg-white/20 text-white hover:bg-white/30"
                )}>
                  {getInitials()}
                </div>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ background: '#0F4264' }}>
        <div className="flex items-center justify-around h-14 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl transition-all flex-1 max-w-[100px]",
                  active ? "text-white" : "text-white/50"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0)]" style={{ background: '#0F4264' }} />
      </nav>

      {/* Main content - with top padding for floating nav */}
      <div className="pt-20 pb-20 md:pb-0 min-h-screen">
        {children}
      </div>
    </div>
  );
}
