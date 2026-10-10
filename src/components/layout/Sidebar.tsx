import { useState } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, getActiveSection } from "@/config/navigation";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ICON_PATHS: Record<string, string> = {
  dashboard:
    "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  calendar:
    "M19 3h-2V1h-2v2H9V1H7v2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 18H5V10h14zm0-13H5V5h14z",
  investments:
    "M3 17h2v4H3zm4-7h2v11H7zm4 4h2v7h-2zm4-3h2v10h-2zm4-6h2v16h-2z",
  planning:
    "M9 2v6H3v2h6v12h2V10h4v12h2V10h6V8h-6V2h-2v6H11V2z",
  budgets:
    "M21.47 10.37a9.98 9.98 0 0 0-7.84-7.84V12l7.84-1.63M11.63 2.53A10 10 0 1 0 21.47 13.6L11.63 12V2.53",
  transactions:
    "M3 7h13V4l5 4-5 4V9H3zm18 10H8v-3l-5 4 5 4v-3h13z",
  files:
    "M3.5 18.49 9.5 12.48l4 4L22 6.92l-1.41-1.41-7.09 7.97-4-4L2 16.99z",
  categories:
    "M21.41 11.58l-9-9A2 2 0 0 0 11 2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 .59 1.42l9 9A2 2 0 0 0 13 22a2 2 0 0 0 1.42-.59l7-7A2 2 0 0 0 22 13a2 2 0 0 0-.59-1.42M5.5 7A1.5 1.5 0 1 1 7 5.5 1.5 1.5 0 0 1 5.5 7",
  accounts:
    "M11.5 1 2 6v2h19V6M2 19v2h19v-2zm3-9v7h3v-7zm5 0v7h3v-7zm5 0v7h3v-7z",
  settings:
    "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 14 2.5h-4a.48.48 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.62 8.98a.49.49 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.42.5.42h4c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61zM12 15.6A3.6 3.6 0 1 1 15.6 12 3.6 3.6 0 0 1 12 15.6",
  preferences:
    "M3 17v2h6v-2zM3 5v2h10V5zm10 16v-2h8v-2h-8v-2h-2v6zM7 9v2H3v2h4v2h2V9zm14 4v-2H11v2zm-6-4h2V7h4V5h-4V3h-2z",
  security:
    "M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5zm-2 16-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9z",
};

const DATA_ICON_KEY: Record<string, string> = {
  transactions: "transactions",
  investments: "files",
  categories: "categories",
};

function NavIcon({ icon, size, fill }: { icon: string; size: number; fill: string }) {
  const d = ICON_PATHS[icon];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="shrink-0">
      <path d={d} fill={fill} />
    </svg>
  );
}

function ShadowSeparator() {
  return (
    <div
      className="h-0 mx-0 border-t border-[#D4D9E2]"
      style={{
        margin: "22px 0 14px",
        boxShadow:
          "0 6px 10px -4px rgba(16,24,40,0.16), 0 2px 4px -1px rgba(16,24,40,0.10)",
      }}
    />
  );
}

interface SidebarItem {
  key: string;
  to: string;
  iconKey: string;
  i18nKey: string;
}

const GROUP_1: SidebarItem[] = [
  { key: "dashboard", to: "/dashboard", iconKey: "dashboard", i18nKey: "navigation.dashboard" },
  { key: "calendar", to: "/calendar", iconKey: "calendar", i18nKey: "navigation.calendar" },
  { key: "investments", to: "/investments", iconKey: "investments", i18nKey: "navigation.investments" },
  { key: "planning", to: "/planning", iconKey: "planning", i18nKey: "navigation.planning" },
  { key: "budgets", to: "/budgets", iconKey: "budgets", i18nKey: "navigation.budgets" },
];

const dataSection = NAV_SECTIONS.find((s) => s.key === "data")!;

const GROUP_3: SidebarItem[] = [
  { key: "accounts", to: "/account?tab=accounts", iconKey: "accounts", i18nKey: "navigation.tabs.data.accounts" },
  { key: "settings", to: "/account", iconKey: "settings", i18nKey: "navigation.settings" },
  { key: "preferences", to: "/account?tab=preferences", iconKey: "preferences", i18nKey: "navigation.preferences" },
  { key: "security", to: "/account?tab=security", iconKey: "security", i18nKey: "navigation.security" },
];

export function Sidebar() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("common");
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logoutOpen, setLogoutOpen] = useState(false);
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
    if (key === "accounts") return accountTab === "accounts";
    if (key === "settings") return !accountTab || accountTab === "overview";
    if (key === "preferences") return accountTab === "preferences";
    if (key === "security") return accountTab === "security";
    return false;
  };

  const handleLogout = async () => {
    setLogoutOpen(false);
    await signOut();
    toast({ title: t("navigation.logoutSuccess") });
    navigate("/auth", { replace: true });
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
              <NavIcon icon={item.iconKey} size={18} fill={active ? "#1B76FF" : "#3A4150"} />
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

      <ShadowSeparator />

      {/* ─── Group 2 — Data sub-tabs ─── */}
      <nav className="flex flex-col">
        {dataSection.subTabs?.map((sub) => {
          const active = isGroup2Active(sub.key);
          const iconKey = DATA_ICON_KEY[sub.key];
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
              {iconKey && (
                <NavIcon icon={iconKey} size={17} fill={active ? "#1B76FF" : "#3A4150"} />
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

      <ShadowSeparator />

      {/* ─── Group 3 — Account ─── */}
      <nav className="flex flex-col">
        {GROUP_3.map((item) => {
          const active = isGroup3Active(item.key);
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
              <NavIcon icon={item.iconKey} size={17} fill={active ? "#1B76FF" : "#3A4150"} />
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
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <span className="block font-sans text-[13px] font-semibold text-[#0C0D0E] truncate">
              {displayName || "Account"}
            </span>
            <span className="block font-sans text-[11.5px] text-[#9AA1AC]">
              {planLabel}
            </span>
          </div>
          <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-[6px] text-[#9AA1AC] hover:text-destructive hover:bg-destructive/[0.08] transition-colors"
                aria-label={t("navigation.logout")}
              >
                <LogOut className="w-[15px] h-[15px]" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("navigation.logoutConfirmTitle", "Log out?")}
                </AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogDescription>
                {t("navigation.logoutConfirmDesc", "Your session will end. You can log back in at any time.")}
              </AlertDialogDescription>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("navigation.logout")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </aside>
  );
}
