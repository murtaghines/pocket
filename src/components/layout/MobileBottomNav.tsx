import { Link, useLocation } from "react-router-dom";
import { Home, PiggyBank, Target, Database, Settings, type LucideIcon } from "lucide-react";
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
 * Mobile bottom navigation — two floating pills that together span the full viewport width
 * (a fixed 7:3 column ratio via grid, so it fills edge-to-edge on any phone size):
 * - Section pill (wider, brand blue): Home / Investments / Planning / Data. `justify-evenly` gives
 *   every icon — including the two at the ends — the exact same spacing, so nothing looks hugged to
 *   an edge. The active item expands its label.
 * - Account pill (narrower, dark blue): a loose settings (gear) icon on the left —
 *   /account?tab=preferences — and the profile avatar (initials) on the right — /account. It uses
 *   a deeper shade of the same brand-blue gradient as the avatar (not black/grey), so the avatar
 *   reads as blending into its background rather than clashing with it.
 * Icons are a uniform, thin stroke and labels are medium weight (never bold) for a clean,
 * minimal look — active state is carried by the background/opacity, not by weight. Both pills use
 * a softer corner radius (not a full capsule) so the perfectly round avatar sits inside a shape
 * that contrasts with it instead of competing with it. Every "chip" (pill edge, active nav item,
 * gear, avatar) shares the same subtle white ring so they read as one consistent family instead
 * of flat colour blocks with no defined edge — the ring simply brightens on the active one.
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

  const onAccount = isActive(ACCOUNT_MATCH);
  const activeAccountTab = new URLSearchParams(location.search).get("tab");
  const settingsActive = onAccount && activeAccountTab === "preferences";
  const avatarActive = onAccount && !settingsActive;

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return f + l || "U";
  })();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50 grid grid-cols-[7fr_3fr] gap-2 px-3 pb-[max(0.6rem,env(safe-area-inset-bottom))] md:hidden">
      {/* Section nav pill */}
      <div className="pointer-events-auto flex items-center justify-evenly rounded-2xl bg-primary p-1.5 shadow-[0_12px_30px_-8px_rgba(20,80,210,0.5)] ring-1 ring-white/10">
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
                "flex items-center rounded-xl py-2.5 transition-all duration-300 ease-out",
                active
                  ? "gap-2 bg-white/[0.16] px-3 text-white ring-1 ring-white/30"
                  : "px-2 text-white/55 active:text-white/80",
              )}
            >
              <Icon className="h-[20px] w-[20px] shrink-0" strokeWidth={1.5} />
              <span
                className={cn(
                  "overflow-hidden whitespace-nowrap text-[13px] font-medium leading-none transition-all duration-300 ease-out",
                  active ? "max-w-[110px] opacity-100" : "max-w-0 opacity-0",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Account pill: settings gear (loose) + avatar — deep blue so it reads as a distinct group
          while staying in the brand-blue family (same hue as --gradient-primary, darker stop) */}
      <div
        className="pointer-events-auto flex items-center justify-evenly rounded-2xl p-1.5 shadow-[0_12px_30px_-8px_rgba(10,45,100,0.55)] ring-1 ring-white/10"
        style={{ background: "linear-gradient(135deg, hsl(216 100% 38%) 0%, hsl(216 100% 21%) 100%)" }}
      >
        <Link
          to="/account?tab=preferences"
          aria-label={t("navigation.settings", "Settings")}
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "flex h-[38px] w-[38px] items-center justify-center rounded-xl transition-colors",
            settingsActive
              ? "bg-white/[0.16] text-white ring-1 ring-white/30"
              : "text-white/55 active:text-white/80",
          )}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </Link>
        <Link
          to="/account"
          aria-label={t("navigation.account", "Account")}
          aria-current={avatarActive ? "page" : undefined}
          className="flex items-center justify-center transition-opacity active:opacity-80"
        >
          {/* Same ring language as the pill edge and the active chips — always present (so the
              avatar never floats border-less) and brighter when this is the active destination. */}
          <span
            className={cn(
              "flex h-[36px] w-[36px] items-center justify-center rounded-full text-[12.5px] font-medium text-primary-foreground ring-2 transition-all",
              avatarActive ? "ring-white/70" : "ring-white/25",
            )}
            style={{ background: "var(--gradient-primary)" }}
          >
            {initials}
          </span>
        </Link>
      </div>
    </nav>
  );
}
