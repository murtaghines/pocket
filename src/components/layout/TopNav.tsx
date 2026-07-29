import { Link, useLocation } from "react-router-dom";
import { House, TrendingUp, PiggyBank, Target, Database, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Route prefixes that keep this button active. */
  match: string[];
}

/**
 * Desktop top navigation — a blue Pocket pill that sits in the middle of the top bar (between the
 * page title / month selector and the notifications / profile cluster). The section you're on
 * expands to show its label; the rest stay icon-only. Mirrors the mobile bottom pill so the two
 * navs read as one system. Account lives in the avatar dropdown, so it isn't repeated here.
 */
export function TopNav() {
  const location = useLocation();
  const { t } = useTranslation("common");

  const items: NavItem[] = [
    { label: t("navigation.overview", "Overview"), path: "/dashboard", icon: House, match: ["/dashboard"] },
    { label: t("navigation.history", "History"), path: "/history", icon: TrendingUp, match: ["/history"] },
    { label: t("navigation.investments", "Investments"), path: "/investments", icon: PiggyBank, match: ["/investments"] },
    { label: t("navigation.planning", "Planning"), path: "/planning", icon: Target, match: ["/planning"] },
    { label: t("navigation.data", "Data"), path: "/my-data", icon: Database, match: ["/my-data", "/categories"] },
  ];

  const isActive = (item: NavItem) =>
    item.match.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  return (
    <div className="flex items-center gap-2 rounded-full bg-primary p-2 shadow-[0_10px_26px_-10px_rgba(20,80,210,0.6)]">
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
              active ? "gap-2.5 bg-white/[0.20] px-4 text-white" : "px-3.5 text-white/65 hover:text-white",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap text-[13.5px] font-medium leading-none transition-all duration-300 ease-out",
                active ? "max-w-[130px] opacity-100" : "max-w-0 opacity-0",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
