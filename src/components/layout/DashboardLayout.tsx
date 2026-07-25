import { ReactNode, useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  User,
  LogOut,
  Search,
  ChevronDown,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { DataRail } from "./DataRail";
import { MobileBottomNav } from "./MobileBottomNav";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
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
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const [searchValue, setSearchValue] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

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
    <div className="min-h-screen bg-background dashboard-theme relative md:pl-[var(--rail-width,104px)] md:transition-[padding-left] md:duration-[220ms] md:ease-out">
      {/* Persistent vertical rail (desktop) */}
      <DataRail />

      {/* Top utility bar (desktop) */}
      <header
        className="hidden md:flex sticky top-0 z-30 h-[74px] items-center justify-between gap-4 px-[30px] bg-background/85 backdrop-blur-[10px]"
      >
        {/* Left: page title + month selector pill */}
        <div className="flex items-center gap-[14px] min-w-0">
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
          <EmptyStateBanner />
        </div>

        {/* Right: search + bell + theme + divider + avatar */}
        <div className="flex items-center gap-[9px] shrink-0">
          {/* Search input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = searchValue.trim();
              if (q) {
                navigate(`/history?search=${encodeURIComponent(q)}`);
                setSearchValue("");
                searchRef.current?.blur();
              }
            }}
            className="flex items-center gap-[9px] bg-card rounded-[11px] px-[13px] py-[9px] w-[210px] text-muted-foreground shadow-sm focus-within:ring-1 focus-within:ring-primary/40 transition-shadow"
          >
            <Search className="w-[16px] h-[16px] shrink-0" strokeWidth={2} />
            <input
              ref={searchRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Search transaction…"
              className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none w-full"
            />
          </form>

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
