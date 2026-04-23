import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, PiggyBank, BarChart3, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { DataRail } from "./DataRail";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const { t } = useTranslation('common');

  // Add dashboard-theme to body so portaled elements (popovers, selects, dialogs) inherit theme
  useEffect(() => {
    document.body.classList.add('dashboard-theme');
    return () => {
      document.body.classList.remove('dashboard-theme');
    };
  }, []);

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
    { label: t('navigation.dashboard', 'Dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { label: t('navigation.total', 'Total'), path: '/total', icon: BarChart3 },
    { label: t('navigation.investments'), path: '/investments', icon: PiggyBank },
  ];

  const mobileNavItems = [
    ...navItems,
    { label: 'Data', path: '/my-data?tab=bank', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-background dashboard-theme relative md:pl-20">
      {/* Persistent vertical data rail (desktop) */}
      <DataRail />

      {/* Top nav — clean, light, inspired by reference */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-4 md:py-5">
          <nav className="flex items-center justify-between gap-4">
            {/* Left: inline navigation (brand lives in the side rail) */}
            <div className="flex items-center">
              <div className="hidden md:flex items-center gap-10">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "relative text-[15px] tracking-tight transition-colors py-1",
                        active
                          ? "text-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground font-medium"
                      )}
                    >
                      {item.label}
                      {active && (
                        <span className="absolute -bottom-1 left-0 right-0 h-[2.5px] bg-foreground rounded-full" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right side: Theme toggle + Bell + Avatar */}
            <div className="flex items-center gap-2 md:gap-3">
              <ThemeToggle />
              <Link to="/profile">
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center text-[15px] font-semibold transition-all overflow-hidden",
                  isActive('/profile')
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                    : "bg-[hsl(0_0%_88%)] dark:bg-muted text-foreground hover:bg-[hsl(0_0%_82%)] dark:hover:bg-muted/70"
                )}>
                  {getInitials()}
                </div>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Mobile bottom nav - kept for mobile UX */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
        <div className="flex items-center justify-around h-14 px-4">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path.split('?')[0]);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-xl transition-all flex-1 max-w-[100px]",
                  active ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0)] bg-card" />
      </nav>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-4 md:px-8 pb-20 md:pb-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
