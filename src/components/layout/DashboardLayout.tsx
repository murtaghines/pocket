import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  TrendingUp,
  Target,
  FileSpreadsheet,
  User,
  LogOut,
  Search,
  ChevronDown,
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
    { label: t("navigation.history", "History"), path: "/history", icon: TrendingUp },
    { label: t("navigation.investments", "Invest"), path: "/investments", icon: PiggyBank },
    { label: "Plan", path: "/planning", icon: Target },
    { label: "Data", path: "/my-data?tab=bank", icon: FileSpreadsheet },
    { label: t("navigation.profile", "Me"), path: "/profile", icon: User },
  ];

  // Page header shown in the desktop top bar for non-dashboard routes
  const pageHeader = (() => {
    if (location.pathname.startsWith("/history")) {
      return { title: t("navigation.history", "History"), subtitle: t("views.historySubtitle", "All your data, every month combined") };
    }
    if (location.pathname.startsWith("/investments")) {
      return { title: t("navigation.investments", "Investments"), subtitle: null };
    }
    if (location.pathname.startsWith("/planning")) {
      return { title: "Planning", subtitle: "Plan upcoming payments and set budgets per category" };
    }
    return null;
  })();

  return (
    <div
      className="min-h-screen bg-background dashboard-theme relative transition-[padding-left] duration-[220ms] ease-out"
      style={{ paddingLeft: "var(--rail-width, 118px)" }}
    >
      {/* Persistent vertical rail (desktop) */}
      <DataRail />

      {/* Top utility bar (desktop) */}
      <header
        className="hidden md:flex sticky top-0 z-30 h-[74px] items-center justify-between gap-4 px-[30px]"
        style={{ background: "hsla(220,24%,96%,.85)", backdropFilter: "blur(10px)" }}
      >
        {/* Left: page title + month selector pill */}
        <div className="flex items-center gap-[14px] min-w-0">
          {location.pathname === "/dashboard" ? (
            <span className="text-[23px] font-semibold tracking-[-0.01em] text-[#0d1220] whitespace-nowrap">
              Dashboard
            </span>
          ) : pageHeader ? (
            <span className="text-[23px] font-semibold tracking-[-0.01em] text-[#0d1220] whitespace-nowrap">
              {pageHeader.title}
            </span>
          ) : null}
          <HeaderMonthSelector />
          <EmptyStateBanner />
        </div>

        {/* Right: search + bell + theme + divider + avatar */}
        <div className="flex items-center gap-[9px] shrink-0">
          {/* Search input */}
          <div
            className="flex items-center gap-[9px] bg-white rounded-[11px] px-[13px] py-[9px] w-[210px] text-[#9aa3b2]"
            style={{ boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}
          >
            <Search className="w-[16px] h-[16px] shrink-0" strokeWidth={2} />
            <span className="text-[13px] whitespace-nowrap">Search transaction…</span>
          </div>

          {/* Notification bell */}
          <div className="relative">
            <NotificationBell variant="light" />
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Divider */}
          <div className="w-px h-[30px] bg-[#dfe3ea] mx-[5px]" />

          {/* Profile cluster */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Profile menu"
                className="flex items-center gap-[10px] cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white text-[13px] font-semibold"
                  style={{ background: "linear-gradient(135deg,hsl(216 100% 60%),hsl(216 100% 42%))" }}
                >
                  {initials}
                </div>
                <ChevronDown className="w-[16px] h-[16px] text-[#6b7280]" strokeWidth={2} />
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
      <main className="w-full px-4 md:px-[30px] pt-4 md:pt-[8px] pb-20 md:pb-[40px] relative z-10">
        {children}
      </main>
    </div>
  );
}
