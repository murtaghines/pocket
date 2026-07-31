import { Link, useLocation } from "react-router-dom";
import { Home, PiggyBank, Target, Database, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";

interface NavItem {
  label: string;
  /** Primary destination for the button. */
  path: string;
  icon: LucideIcon;
  /** Route prefixes that keep this button active (groups several pages under one button). */
  match: string[];
}

const ACCOUNT_MATCH = ["/account", "/profile"];

/**
 * Mobile bottom navigation — two floating blue pills, mirroring the desktop top bar where the
 * account avatar sits apart from the section pill nav. The active destination in the main pill
 * expands to reveal its label (Home / Investments / Planning / Data); the account pill is a single
 * avatar button (initials, like HeaderUserMenu) linking to /account.
 */
export function MobileBottomNav() {
  const location = useLocation();
  const { t } = useTranslation("common");
  const { profile } = useProfile();

  const items: NavItem[] = [
    { label: t("navigation.home", "Home"), path: "/dashboard", icon: Home, match: ["/dashboard", "/history"] },
    { label: t("navigation.investments", "Investments"), path: "/investments", icon: PiggyBank, match: ["/investments"] },
    { label: t("navigation.planning", "Planning"), path: "/planning", icon: Target, match: ["/planning"] },
    { label: t("navigation.data", "Data"), path: "/my-data", icon: Database, match: ["/my-data", "/categories"] },
  ];

  const isActive = (match: string[]) =>
    match.some((p) => location.pathname === p || location.pathname.startsWith(p + "/"));

  const accountActive = isActive(ACCOUNT_MATCH);

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return f + l || "U";
  })();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center gap-2 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      {/* Section nav pill — ~3/4 of the row */}
      <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-primary p-1.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)]">
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

      {/* Account pill — separate, ~1/4 of the row, avatar like the desktop profile cluster */}
      <Link
        to="/account"
        aria-label={t("navigation.account", "Account")}
        aria-current={accountActive ? "page" : undefined}
        className={cn(
          "pointer-events-auto flex items-center justify-center rounded-full bg-primary p-1.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)] transition-opacity active:opacity-80",
        )}
      >
        <span
          className={cn(
            "flex h-[38px] w-[38px] items-center justify-center rounded-full text-[13px] font-semibold text-primary-foreground transition-shadow",
            accountActive ? "ring-2 ring-white/70" : "ring-0",
          )}
          style={{ background: "var(--gradient-primary)" }}
        >
          {initials}
        </span>
      </Link>
    </nav>
  );
}
