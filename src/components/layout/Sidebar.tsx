import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  House,
  CalendarDays,
  PiggyBank,
  Target,
  Wallet,
  ArrowLeftRight,
  TrendingUp,
  Tag,
  Landmark,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection } from "@/config/navigation";
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

interface SidebarItem {
  key: string;
  to: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  i18nKey: string;
  ns?: string;
}

const GROUP_1: SidebarItem[] = [
  { key: "dashboard", to: "/dashboard", icon: House, i18nKey: "navigation.dashboard" },
  { key: "calendar", to: "/calendar", icon: CalendarDays, i18nKey: "navigation.calendar" },
  { key: "investments", to: "/investments", icon: PiggyBank, i18nKey: "navigation.investments" },
  { key: "planning", to: "/planning", icon: Target, i18nKey: "navigation.planning" },
  { key: "budgets", to: "/budgets", icon: Wallet, i18nKey: "navigation.budgets" },
];

const dataSection = NAV_SECTIONS.find((s) => s.key === "data")!;

const DATA_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  transactions: ArrowLeftRight,
  investments: TrendingUp,
  categories: Tag,
  accounts: Landmark,
};

const GROUP_3: SidebarItem[] = [
  { key: "settings", to: "/account", icon: Settings, i18nKey: "navigation.settings" },
  { key: "preferences", to: "/account?tab=preferences", icon: SlidersHorizontal, i18nKey: "navigation.preferences" },
  { key: "security", to: "/account?tab=security", icon: ShieldCheck, i18nKey: "navigation.security" },
];

export function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const activeSection = getActiveSection(location.pathname);
  const isAccountPath = location.pathname.startsWith("/account");
  const accountTab = searchParams.get("tab");

  const displayName = (() => {
    const first = profile?.first_name?.trim() ?? "";
    const last = profile?.last_name?.trim() ?? "";
    return [first, last].filter(Boolean).join(" ");
  })();

  const planLabel = profile?.subscription_tier === "pro" ? "Plan pro" : "Plan personal";

  const linkFor = (tabKey: string) => {
    const params = new URLSearchParams();
    if (tabKey !== dataSection.defaultTab) params.set("tab", tabKey);
    const qs = params.toString();
    return `${dataSection.path}${qs ? `?${qs}` : ""}`;
  };

  const isGroup1Active = (key: string) => activeSection?.key === key;

  const isGroup2Active = (tabKey: string) => {
    if (activeSection?.key !== "data") return false;
    const currentTab = searchParams.get("tab") ?? dataSection.defaultTab;
    return currentTab === tabKey;
  };

  const isGroup3Active = (key: string) => {
    if (!isAccountPath) return false;
    if (key === "settings") return !accountTab || accountTab === "overview" || accountTab === "accounts";
    if (key === "preferences") return accountTab === "preferences";
    if (key === "security") return accountTab === "security";
    return false;
  };

  return (
    <aside className="hidden md:flex flex-col w-[218px] flex-none h-dvh bg-card border-r border-[#EDEFF4] py-[22px] pb-[16px] overflow-y-auto">
      {/* Logo */}
      <Link to="/dashboard" className="flex items-center gap-[9px] px-[20px] mb-[34px] text-primary no-underline">
        <Logo variant="mark" size={21} />
        <span className="font-heading font-bold text-[18px] tracking-[-0.01em] lowercase text-primary">
          pocket
        </span>
      </Link>

      {/* ─── Group 1 — Main sections ─── */}
      <nav className="flex flex-col">
        {GROUP_1.map((item) => {
          const active = isGroup1Active(item.key);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={cn(
                "flex items-center gap-[12px] h-[38px] px-[20px] transition-[background] duration-[120ms] no-underline",
                active
                  ? "bg-[rgba(27,118,255,0.11)]"
                  : "hover:bg-[rgba(27,118,255,0.05)]",
              )}
            >
              <Icon
                className={cn("w-[17px] h-[17px] shrink-0", active ? "text-[#1B76FF]" : "text-[#3A4150]")}
                strokeWidth={1.9}
              />
              <span
                className={cn(
                  "font-sans text-[13.5px] lowercase",
                  active ? "font-bold text-[#1B76FF]" : "font-medium text-[#2A303A]",
                )}
              >
                {t(item.i18nKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Separator with shadow */}
      <div
        className="h-0 mx-0 border-t border-[#D4D9E2]"
        style={{
          margin: "18px 0 10px",
          boxShadow: "0 6px 8px -4px rgba(16,24,40,0.14), 0 2px 3px -1px rgba(16,24,40,0.08)",
        }}
      />

      {/* ─── Group 2 — Data sub-tabs ─── */}
      <nav className="flex flex-col">
        {dataSection.subTabs?.map((sub) => {
          const active = isGroup2Active(sub.key);
          const SubIcon = DATA_ICONS[sub.key];
          return (
            <Link
              key={sub.key}
              to={linkFor(sub.key)}
              className={cn(
                "flex items-center gap-[12px] h-[36px] px-[20px] transition-[background] duration-[120ms] no-underline",
                active
                  ? "bg-[rgba(27,118,255,0.11)]"
                  : "hover:bg-[rgba(27,118,255,0.05)]",
              )}
            >
              {SubIcon && (
                <SubIcon
                  className={cn("w-[17px] h-[17px] shrink-0", active ? "text-[#1B76FF]" : "text-[#3A4150]")}
                  strokeWidth={1.9}
                />
              )}
              <span
                className={cn(
                  "font-sans text-[13px] lowercase",
                  active ? "font-bold text-[#1B76FF]" : "font-medium text-[#2A303A]",
                )}
              >
                {t(sub.i18nKey, { ns: sub.ns ?? "common" })}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Separator with shadow */}
      <div
        className="h-0 mx-0 border-t border-[#D4D9E2]"
        style={{
          margin: "18px 0 10px",
          boxShadow: "0 6px 8px -4px rgba(16,24,40,0.14), 0 2px 3px -1px rgba(16,24,40,0.08)",
        }}
      />

      {/* ─── Group 3 — Account ─── */}
      <nav className="flex flex-col">
        {GROUP_3.map((item) => {
          const active = isGroup3Active(item.key);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              to={item.to}
              className={cn(
                "flex items-center gap-[12px] h-[36px] px-[20px] transition-[background] duration-[120ms] no-underline",
                active
                  ? "bg-[rgba(27,118,255,0.11)]"
                  : "hover:bg-[rgba(27,118,255,0.05)]",
              )}
            >
              <Icon
                className={cn("w-[17px] h-[17px] shrink-0", active ? "text-[#1B76FF]" : "text-[#3A4150]")}
                strokeWidth={1.9}
              />
              <span
                className={cn(
                  "font-sans text-[13px] lowercase",
                  active ? "font-bold text-[#1B76FF]" : "font-medium text-[#2A303A]",
                )}
              >
                {t(item.i18nKey)}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="mt-auto border-t border-[#EDEFF4] px-[20px] pt-[14px] pb-[2px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex flex-col w-full text-left cursor-pointer"
            >
              <span className="block font-sans text-[13px] font-semibold text-[#0C0D0E]">
                {displayName || "Account"}
              </span>
              <span className="block font-sans text-[11.5px] text-[#9AA1AC]">
                {planLabel}
              </span>
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
