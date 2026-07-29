import { ReactNode, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  User,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { TopNav } from "./TopNav";
import { MobileBottomNav } from "./MobileBottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTransactions } from "@/hooks/useTransactions";
import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { HeaderMonthSelector } from "./HeaderMonthSelector";
import { HeaderGranularitySelector } from "./HeaderGranularitySelector";
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
    <div className="min-h-screen bg-background dashboard-theme relative">
      {/* Top utility bar (desktop): page title + month selector · centered pill nav · utilities */}
      <header
        className="hidden md:flex sticky top-0 z-30 h-[74px] items-center gap-4 px-[30px] bg-background/85 backdrop-blur-[10px]"
      >
        {/* Left: page title + month selector pill (flex-1 so the centre pill stays centred) */}
        <div className="flex flex-1 items-center gap-[14px] min-w-0">
          {location.pathname === "/dashboard" ? (
            <span className="text-[20px] font-semibold tracking-[-0.01em] text-foreground whitespace-nowrap">
              Dashboard
            </span>
          ) : pageHeader ? (
            <span className="text-[20px] font-semibold tracking-[-0.01em] text-foreground whitespace-nowrap">
              {pageHeader.title}
            </span>
          ) : null}
          <HeaderMonthSelector />
          <HeaderGranularitySelector />
          <EmptyStateBanner />
        </div>

        {/* Center: the Pocket pill nav, centred in the top bar */}
        <div className="shrink-0">
          <TopNav />
        </div>

        {/* Right: bell + theme + divider + avatar (flex-1 to mirror the left cluster) */}
        <div className="flex flex-1 items-center justify-end gap-[9px] min-w-0">
          {/* Notification bell */}
          <div className="relative">
            <NotificationBell variant="light" />
          </div>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* Divider */}
          <div className="w-px h-[30px] bg-border mx-[5px]" />

          {/* Profile cluster */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Profile menu"
                className="flex items-center gap-[10px] cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div
                  className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-primary-foreground text-[13px] font-semibold"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {initials}
                </div>
                <ChevronDown className="w-[16px] h-[16px] text-muted-foreground" strokeWidth={2} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link to="/account" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  {t("navigation.account", "Account")}
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
      <MobileBottomNav />

      {/* Main content */}
      <main className="w-full px-4 md:px-[30px] pt-4 md:pt-[8px] pb-20 md:pb-[40px] relative z-10">
        {children}
      </main>
    </div>
  );
}
