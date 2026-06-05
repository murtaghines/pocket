import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  BarChart3,
  Target,
  FileSpreadsheet,
  User,
  LogOut,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { DataRail } from "./DataRail";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransactions } from "@/hooks/useTransactions";
import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { HeaderMonthSelector } from "./HeaderMonthSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return (f + l) || "U";
  })();

  // Add dashboard-theme to body so portaled elements (popovers, selects, dialogs) inherit theme
  useEffect(() => {
    document.body.classList.add("dashboard-theme");
    return () => {
      document.body.classList.remove("dashboard-theme");
    };
  }, []);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const mobileNavItems = [
    { label: t("navigation.dashboard", "Home"), path: "/dashboard", icon: LayoutDashboard },
    { label: t("navigation.history", "History"), path: "/history", icon: BarChart3 },
    { label: t("navigation.investments", "Invest"), path: "/investments", icon: PiggyBank },
    { label: "Plan", path: "/planning/budgets", icon: Target },
    { label: "Data", path: "/my-data?tab=bank", icon: FileSpreadsheet },
    { label: t("navigation.profile", "Me"), path: "/profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background dashboard-theme relative md:pl-24">
      {/* Persistent vertical rail (desktop) handles all navigation + utilities */}
      <DataRail />

      {/* Top utility bar (desktop) — month selector on left, theme + profile on right */}
      <header className="hidden md:flex sticky top-0 z-30 h-16 items-center justify-between gap-3 px-6 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center min-w-0 gap-4">
          <HeaderMonthSelector />
          <EmptyStateBanner />
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell variant="light" />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Profile menu"
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all",
                location.pathname === "/profile"
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground text-background hover:opacity-90",
              )}
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                <User className="w-4 h-4" />
                {t("navigation.profile", "Profile")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              {t("navigation.logout", "Log out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
        <div className="flex items-stretch justify-between h-14 px-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path.split("?")[0]);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl transition-all flex-1 min-w-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-medium leading-none truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom,0)] bg-card" />
      </nav>

      {/* Main content */}
      <main className="w-full px-4 md:px-8 pt-6 md:pt-2 pb-20 md:pb-8 relative z-10">
        {children}
      </main>
    </div>
  );
}
