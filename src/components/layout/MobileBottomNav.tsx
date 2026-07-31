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
 * Mobile bottom navigation — a single floating brand-blue pill spanning the full viewport width,
 * matching the reference "pill nav" pattern exactly: inactive destinations are plain icons with no
 * background, evenly spaced (`justify-evenly`, so the two at the ends get the same breathing room
 * as the middle ones); the active destination becomes a white capsule that nests a small
 * rounded-square icon badge (still in brand blue, icon inverted to white) next to its label in
 * blue text — "an icon inside a badge inside a pill inside the bar".
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
      <div className="pointer-events-auto flex w-full items-center justify-evenly rounded-full bg-primary p-1.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)]">
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
                "flex items-center rounded-full transition-all duration-300 ease-out",
                active ? "gap-2 bg-white py-1 pl-1 pr-3.5" : "p-2.5",
              )}
            >
              {active ? (
                <>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="h-[16px] w-[16px]" strokeWidth={2} />
                  </span>
                  <span className="whitespace-nowrap text-[13px] font-medium leading-none text-primary">
                    {item.label}
                  </span>
                </>
              ) : (
                <Icon className="h-5 w-5 text-white/70" strokeWidth={1.75} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
