import { Link, useLocation } from "react-router-dom";
import { Home, PiggyBank, Target, Database, User, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  /** Primary destination for the button. */
  path: string;
  icon: LucideIcon;
  /** Route prefixes that keep this button active (groups several pages under one button). */
  match: string[];
}

/**
 * Mobile bottom navigation — a floating blue pill. The active destination expands to reveal
 * its label (like the reference design), the rest stay icon-only. Five grouped buttons:
 * Home (Dashboard + History), Investments, Planning, Data (My Data + Categories) and Account.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation("common");

  const items: NavItem[] = [
    { label: t("navigation.home", "Home"), path: "/dashboard", icon: Home, match: ["/dashboard", "/history"] },
    { label: t("navigation.investments", "Investments"), path: "/investments", icon: PiggyBank, match: ["/investments"] },
    { label: t("navigation.planning", "Planning"), path: "/planning", icon: Target, match: ["/planning"] },
    { label: t("navigation.data", "Data"), path: "/my-data", icon: Database, match: ["/my-data", "/categories"] },
    { label: t("navigation.account", "Account"), path: "/account", icon: User, match: ["/account", "/profile"] },
  ];

  const isActive = (item: NavItem) =>
    item.match.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-primary p-1.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center rounded-full py-2.5 transition-all duration-300 ease-out",
                active ? "gap-2 bg-white/[0.22] px-3 text-white" : "px-2 text-white/55 active:text-white/80",
              )}
            >
              <Icon className="h-[22px] w-[22px] shrink-0" strokeWidth={active ? 2.4 : 2} />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-[13px] font-semibold leading-none transition-all duration-300 ease-out",
                  active ? "max-w-[110px] opacity-100" : "max-w-0 opacity-0",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
