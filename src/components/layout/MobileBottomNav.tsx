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
 * Mobile bottom navigation — a single floating brand-blue pill spanning the full viewport width.
 * The pill uses `py-2.5` vertical padding and `justify-evenly` so every gap — edge-to-first,
 * between each pair, last-to-edge — is exactly equal. Active chips get a minimum width so
 * short labels like "Data" don't shrink to a sliver next to "Investments".
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

  const isActive = (match: string[]) =>
    match.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      <div className="pointer-events-auto flex w-full items-center justify-evenly rounded-full bg-primary py-2.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.match);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center rounded-full py-2 transition-all duration-300 ease-out",
                active ? "gap-1.5 bg-white/[0.18] px-3 min-w-[5rem]" : "px-2",
              )}
            >
              <Icon
                className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-white/60")}
                strokeWidth={active ? 2 : 1.5}
              />
              {active && (
                <span className="whitespace-nowrap text-[13px] font-medium leading-none text-white">
                  {item.label}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
