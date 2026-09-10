import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronDown, ArrowLeftRight, TrendingUp, Tag, Landmark } from "lucide-react";
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

const mainSections = NAV_SECTIONS.filter((s) => s.key !== "data");
const dataSection = NAV_SECTIONS.find((s) => s.key === "data")!;

export function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const activeSection = getActiveSection(location.pathname);
  const activeTab = getActiveTabKey(dataSection, searchParams);

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

  return (
    <aside className="hidden md:flex flex-col w-[214px] flex-none h-dvh bg-card border-r border-[#EDEFF4] py-[22px] px-[16px] gap-[26px] overflow-y-auto">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-[9px] px-[8px] text-primary no-underline">
        <Logo variant="mark" size={21} />
        <span className="font-heading font-bold text-[18px] tracking-[-0.01em] lowercase text-primary">
          pocket
        </span>
      </Link>

      {/* Main nav */}
      <nav className="flex flex-col gap-[4px]">
        {mainSections.map((section) => {
          const active = activeSection?.key === section.key;
          const Icon = section.icon;
          return (
            <Link
              key={section.key}
              to={section.path}
              className={cn(
                "flex items-center gap-[11px] h-[40px] px-[13px] rounded-[13px] transition-colors duration-[120ms] no-underline",
                active
                  ? "bg-[#EFF4FF]"
                  : "hover:bg-[#F4F6FC]",
              )}
            >
              <Icon
                className={cn("w-[17px] h-[17px]", active ? "text-primary" : "text-[#B4BAC3]")}
                strokeWidth={1.9}
              />
              <span
                className={cn(
                  "font-heading text-[14px] lowercase",
                  active ? "font-semibold text-primary" : "font-medium text-[#5A6069]",
                )}
              >
                {t(section.i18nKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Data section */}
      <div className="border-t border-[#EDEFF4] pt-[14px] flex flex-col gap-[2px]">
        <div className="flex items-center gap-[8px] px-[13px] pb-[6px]">
          <dataSection.icon className="w-[14px] h-[14px] text-[#B4BAC3]" strokeWidth={2} />
          <span className="font-sans text-[10.5px] font-semibold tracking-[0.09em] uppercase text-[#B4BAC3]">
            {t(dataSection.i18nKey)}
          </span>
        </div>
        {dataSection.subTabs?.map((sub) => {
          const isDataActive = activeSection?.key === "data" && activeTab === sub.key;
          const SubIcon = DATA_ICONS[sub.key];
          return (
            <Link
              key={sub.key}
              to={linkFor(sub.key)}
              className={cn(
                "flex items-center gap-[11px] h-[36px] px-[13px] rounded-[12px] transition-colors duration-[120ms] no-underline",
                isDataActive
                  ? "bg-[#EFF4FF]"
                  : "hover:bg-[#F4F6FC]",
              )}
            >
              {SubIcon && (
                <SubIcon
                  className={cn("w-[16px] h-[16px]", isDataActive ? "text-primary" : "text-[#B4BAC3]")}
                  strokeWidth={1.9}
                />
              )}
              <span
                className={cn(
                  "font-heading text-[13.5px] lowercase",
                  isDataActive ? "font-semibold text-primary" : "font-medium text-[#5A6069]",
                )}
              >
                {t(sub.i18nKey, { ns: sub.ns ?? "common" })}
              </span>
            </Link>
          );
        })}
      </div>

      {/* User footer */}
      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-[9px] py-[2px] px-[4px] w-full text-left cursor-pointer rounded-[12px] hover:bg-[#F4F6FC] transition-colors"
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
              <ChevronDown className="w-[14px] h-[14px] text-[#B4BAC3] shrink-0" strokeWidth={2.2} />
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
