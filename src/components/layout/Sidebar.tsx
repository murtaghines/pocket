import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, ArrowLeftRight, TrendingUp, Tag, Landmark, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection, getActiveTabKey } from "@/config/navigation";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, LogOut } from "lucide-react";

const DATA_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  transactions: ArrowLeftRight,
  investments: TrendingUp,
  categories: Tag,
  accounts: Landmark,
};

const analysisKeys = new Set(["dashboard", "calendar"]);
const dataKeys = new Set(["investments", "planning", "budgets"]);

const analysisSections = NAV_SECTIONS.filter((s) => analysisKeys.has(s.key));
const dataSections = NAV_SECTIONS.filter((s) => dataKeys.has(s.key));
const dataSection = NAV_SECTIONS.find((s) => s.key === "data")!;

export function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const activeSection = getActiveSection(location.pathname);
  const activeTab = getActiveTabKey(dataSection, searchParams);
  const isAccountActive = location.pathname.startsWith("/account");

  const displayName = (() => {
    const first = profile?.first_name?.trim() ?? "";
    const last = profile?.last_name?.trim() ?? "";
    return [first, last].filter(Boolean).join(" ");
  })();

  const initials = (() => {
    const first = profile?.first_name?.trim() ?? "";
    const last = profile?.last_name?.trim() ?? "";
    return (first[0] ?? "").toUpperCase() + (last[0] ?? "").toUpperCase();
  })();

  const planLabel = profile?.subscription_tier === "pro" ? "Plan pro" : "Plan personal";

  const linkFor = (tabKey: string) => {
    const params = new URLSearchParams();
    if (tabKey !== dataSection.defaultTab) params.set("tab", tabKey);
    const qs = params.toString();
    return `${dataSection.path}${qs ? `?${qs}` : ""}`;
  };

  const navItemClass = (active: boolean) =>
    cn(
      "flex items-center gap-[11px] h-[38px] px-[14px] transition-colors duration-[120ms] no-underline",
      active
        ? "bg-[#EFF4FF] border-l-[3px] border-l-primary pl-[11px]"
        : "hover:bg-[#F6F7F9]",
    );

  return (
    <aside className="hidden md:flex flex-col w-[214px] flex-none h-dvh bg-card border-r border-[#EDEFF4] py-[22px] overflow-y-auto">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-[9px] px-[22px] mb-[22px] text-primary no-underline">
        <Logo variant="mark" size={21} />
        <span className="font-heading font-bold text-[18px] tracking-[-0.01em] lowercase text-primary">
          pocket
        </span>
      </Link>

      {/* ─── Analysis group ─── */}
      <nav className="flex flex-col">
        <span className="px-[22px] pb-[6px] font-sans text-[10px] font-semibold tracking-[0.09em] uppercase text-[#9AA1AC]">
          {t("navigation.analysis", "Analysis")}
        </span>
        {analysisSections.map((section) => {
          const active = activeSection?.key === section.key;
          const Icon = section.icon;
          return (
            <Link key={section.key} to={section.path} className={navItemClass(active)}>
              <Icon
                className={cn("w-[17px] h-[17px]", active ? "text-primary" : "text-[#6B7280]")}
                strokeWidth={1.9}
              />
              <span
                className={cn(
                  "font-heading text-[13.5px] lowercase",
                  active ? "font-bold text-primary" : "font-medium text-[#5A6069]",
                )}
              >
                {t(section.i18nKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-[#EDEFF4] mx-[16px] my-[10px]" />

      {/* ─── Data group ─── */}
      <nav className="flex flex-col">
        <span className="px-[22px] pb-[6px] font-sans text-[10px] font-semibold tracking-[0.09em] uppercase text-[#9AA1AC]">
          {t(dataSection.i18nKey)}
        </span>
        {dataSections.map((section) => {
          const active = activeSection?.key === section.key;
          const Icon = section.icon;
          return (
            <Link key={section.key} to={section.path} className={navItemClass(active)}>
              <Icon
                className={cn("w-[17px] h-[17px]", active ? "text-primary" : "text-[#6B7280]")}
                strokeWidth={1.9}
              />
              <span
                className={cn(
                  "font-heading text-[13.5px] lowercase",
                  active ? "font-bold text-primary" : "font-medium text-[#5A6069]",
                )}
              >
                {t(section.i18nKey)}
              </span>
            </Link>
          );
        })}
        {dataSection.subTabs?.map((sub) => {
          const isDataActive = activeSection?.key === "data" && activeTab === sub.key;
          const SubIcon = DATA_ICONS[sub.key];
          return (
            <Link key={sub.key} to={linkFor(sub.key)} className={navItemClass(isDataActive)}>
              {SubIcon && (
                <SubIcon
                  className={cn("w-[16px] h-[16px]", isDataActive ? "text-primary" : "text-[#6B7280]")}
                  strokeWidth={1.9}
                />
              )}
              <span
                className={cn(
                  "font-heading text-[13.5px] lowercase",
                  isDataActive ? "font-bold text-primary" : "font-medium text-[#5A6069]",
                )}
              >
                {t(sub.i18nKey, { ns: sub.ns ?? "common" })}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="border-t border-[#EDEFF4] mx-[16px] my-[10px]" />

      {/* ─── Account group ─── */}
      <nav className="flex flex-col">
        <span className="px-[22px] pb-[6px] font-sans text-[10px] font-semibold tracking-[0.09em] uppercase text-[#9AA1AC]">
          {t("navigation.account", "Account")}
        </span>
        <Link to="/account" className={navItemClass(isAccountActive)}>
          <Settings
            className={cn("w-[17px] h-[17px]", isAccountActive ? "text-primary" : "text-[#6B7280]")}
            strokeWidth={1.9}
          />
          <span
            className={cn(
              "font-heading text-[13.5px] lowercase",
              isAccountActive ? "font-bold text-primary" : "font-medium text-[#5A6069]",
            )}
          >
            {t("navigation.settings", "settings")}
          </span>
        </Link>
      </nav>

      {/* User footer */}
      <div className="mt-auto px-[10px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-[9px] py-[6px] px-[8px] w-full text-left cursor-pointer hover:bg-[#F6F7F9] transition-colors"
            >
              <span className="w-[30px] h-[30px] rounded-full bg-primary text-white flex items-center justify-center font-sans text-[11.5px] font-bold shrink-0">
                {initials || <User className="w-3.5 h-3.5" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-sans text-[13px] font-medium text-[#0C0D0E] truncate">
                  {displayName || "Account"}
                </span>
                <span className="block font-sans text-[11.5px] text-[#9AA1AC]">
                  {planLabel}
                </span>
              </span>
              <ChevronDown className="w-[14px] h-[14px] text-[#9AA1AC] shrink-0" strokeWidth={2.2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
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
    </aside>
  );
}
