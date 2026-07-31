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
 * Plain flexbox with `justify-evenly`, not a grid: grid columns of equal width forced the (much
 * wider) active item to overflow its column, which overlapped the pill's rounded end whenever
 * Home or Account (the first/last items) were active. Flex sizes each item to its own content and
 * only distributes the *leftover* space as gaps — `justify-evenly` guarantees those gaps
 * (edge-to-first, between every pair, last-to-edge) are exactly equal by spec, regardless of how
 * wide the active item's label is. The active chip's own padding is symmetric (no icon hugging one
 * side) so it doesn't introduce its own lopsidedness either.
 * The pill has NO horizontal padding of its own (only vertical, for height) — any container-level
 * horizontal padding would stack on top of justify-evenly's already-equal edge gap, making the
 * edges visibly wider than the gaps between icons (dead space at the ends). Letting justify-evenly
 * be the only source of spacing keeps edges exactly as tight as the interior.
 * Icons stay in their original outline style (no fill) at every state — only color/opacity and the
 * background pill signal the active one.
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
      <div className="pointer-events-auto flex w-full items-center justify-evenly rounded-full bg-primary py-2 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.55)]">
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
                active ? "gap-1.5 bg-white/[0.18] px-3" : "px-2",
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
