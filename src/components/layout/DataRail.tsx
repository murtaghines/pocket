import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  History as HistoryIcon,
  PiggyBank,
  Wallet,
  Target,
  FileSpreadsheet,
  PanelLeftOpen,
  PanelLeftClose,
  LogOut,
  Sun,
  Moon,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "react-i18next";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";

type NavChild = {
  label: string;
  to: string;
  icon: LucideIcon;
};

type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  children?: NavChild[];
};

/**
 * Persistent left rail. Collapsed by default (icon strip); when the
 * user opens it, it expands to a full sidebar with grouped navigation,
 * mirroring modern product UIs (Pipeline Radar / Zelos style).
 * Branding stays blue. The bottom cluster keeps utility actions
 * (My Data, theme toggle, sign out) within thumb reach.
 */
export function DataRail() {
  const location = useLocation();
  const { signOut } = useAuth();
  const { profile } = useProfile();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation("common");
  const [expanded, setExpanded] = useState(false);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const dashboardChildren: NavChild[] = [
    { label: "Monthly", to: "/dashboard", icon: LayoutDashboard },
    { label: "History", to: "/history", icon: HistoryIcon },
    { label: "Calendar", to: "/calendar", icon: CalendarDays },
  ];

  const planningChildren: NavChild[] = [
    { label: "Planned payments", to: "/planning/planned", icon: Wallet },
    { label: "Budgets", to: "/planning/budgets", icon: Target },
  ];

  const groups: NavGroup[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      children: dashboardChildren,
    },
    {
      key: "investments",
      label: "Investments",
      icon: PiggyBank,
      to: "/investments",
    },
    {
      key: "planning",
      label: "Planning",
      icon: Target,
      children: planningChildren,
    },
  ];

  const initials = (() => {
    const f = profile?.first_name?.charAt(0).toUpperCase() ?? "";
    const l = profile?.last_name?.charAt(0).toUpperCase() ?? "";
    return (f + l) || "U";
  })();

  const railWidth = expanded ? "w-64" : "w-24";

  return (
    <TooltipProvider delayDuration={200}>
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 z-40 bg-primary text-primary-foreground flex-col py-5 transition-[width] duration-300 ease-out",
          railWidth,
        )}
        aria-label="Primary navigation"
      >
        {/* Top: brand */}
        <div
          className={cn(
            "flex items-center px-4",
            expanded ? "justify-between" : "justify-center",
          )}
        >
          <Link
            to="/dashboard"
            aria-label="Pocket — go to dashboard"
            className="flex items-center gap-2"
          >
            <img src={pocketLogoWhite} alt="Pocket" className="h-12 w-12" />
            {expanded && (
              <span className="text-lg font-semibold tracking-tight">
                Pocket
              </span>
            )}
          </Link>
          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse navigation"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand toggle when collapsed */}
        {!expanded && (
          <div className="flex justify-center mt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label="Expand navigation"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-primary-foreground/80 hover:bg-primary-foreground/10 transition-colors"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                Expand
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto mt-6 px-3">
          {expanded ? (
            <div className="space-y-6">
              <p className="px-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-primary-foreground/50">
                Manage
              </p>
              {groups.map((group) => (
                <ExpandedGroup
                  key={group.key}
                  group={group}
                  isActive={isActive}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              {groups.flatMap((group) => {
                const items: NavChild[] = group.children
                  ? group.children
                  : group.to
                    ? [{ label: group.label, to: group.to, icon: group.icon }]
                    : [];
                return items.map((item) => (
                  <CollapsedItem
                    key={item.to}
                    item={item}
                    active={isActive(item.to)}
                  />
                ));
              })}
            </div>
          )}
        </nav>

        {/* Bottom utility cluster */}
        <div
          className={cn(
            "mt-4 border-t border-primary-foreground/15 pt-4 px-3 space-y-2",
            expanded ? "" : "flex flex-col items-center",
          )}
        >
          {expanded && (
            <p className="px-3 text-[10px] font-semibold tracking-[0.18em] uppercase text-primary-foreground/50">
              Workspace
            </p>
          )}

          <RailUtility
            expanded={expanded}
            to="/my-data?tab=bank"
            icon={FileSpreadsheet}
            label={t("navigation.myData", "My Data")}
            active={location.pathname === "/my-data"}
          />

          <RailUtility
            expanded={expanded}
            as="button"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            icon={theme === "dark" ? Sun : Moon}
            label={theme === "dark" ? "Light mode" : "Dark mode"}
          />

          <RailUtility
            expanded={expanded}
            to="/profile"
            icon={null}
            label={profile?.first_name || t("navigation.profile", "Profile")}
            active={location.pathname === "/profile"}
            avatarInitials={initials}
          />

          <RailUtility
            expanded={expanded}
            as="button"
            onClick={() => signOut()}
            icon={LogOut}
            label={t("navigation.logout", "Log out")}
          />
        </div>
      </aside>
    </TooltipProvider>
  );
}

function CollapsedItem({
  item,
  active,
}: {
  item: NavChild;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={item.to}
          aria-label={item.label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all border",
            active
              ? "bg-primary-foreground text-primary border-primary-foreground shadow-md"
              : "bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20 hover:bg-primary-foreground/20",
          )}
        >
          <Icon className="w-5 h-5" />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

function ExpandedGroup({
  group,
  isActive,
}: {
  group: NavGroup;
  isActive: (path: string) => boolean;
}) {
  const Icon = group.icon;

  if (!group.children) {
    const active = group.to ? isActive(group.to) : false;
    return (
      <Link
        to={group.to ?? "#"}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors",
          active
            ? "bg-primary-foreground/15 text-primary-foreground"
            : "text-primary-foreground/85 hover:bg-primary-foreground/10",
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{group.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-3 mb-1.5 text-primary-foreground/70">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-semibold tracking-tight uppercase">
          {group.label}
        </span>
      </div>
      <div className="ml-3 border-l border-primary-foreground/15 pl-2 space-y-0.5">
        {group.children.map((child) => {
          const active = isActive(child.to);
          return (
            <Link
              key={child.to}
              to={child.to}
              className={cn(
                "flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary-foreground text-primary font-semibold shadow-sm"
                  : "text-primary-foreground/85 hover:bg-primary-foreground/10",
              )}
            >
              <span className="flex-1 truncate">{child.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5" />}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

type RailUtilityProps = {
  expanded: boolean;
  icon: LucideIcon | null;
  label: string;
  active?: boolean;
  avatarInitials?: string;
} & (
  | { as?: "link"; to: string; onClick?: never }
  | { as: "button"; onClick: () => void; to?: never }
);

function RailUtility(props: RailUtilityProps) {
  const { expanded, icon: Icon, label, active, avatarInitials } = props;

  const content = (
    <>
      {avatarInitials ? (
        <span
          className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0",
            active
              ? "bg-primary-foreground text-primary"
              : "bg-primary-foreground/15 text-primary-foreground",
          )}
        >
          {avatarInitials}
        </span>
      ) : Icon ? (
        <Icon className="w-4 h-4 flex-shrink-0" />
      ) : null}
      {expanded && <span className="text-sm truncate">{label}</span>}
    </>
  );

  const className = cn(
    "transition-colors",
    expanded
      ? cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-primary-foreground/85 hover:bg-primary-foreground/10",
          active && "bg-primary-foreground/15 text-primary-foreground",
        )
      : cn(
          "w-12 h-12 rounded-xl flex items-center justify-center border border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20",
          active &&
            "bg-primary-foreground text-primary border-primary-foreground shadow-md",
        ),
  );

  const wrapped =
    !("as" in props) || props.as !== "button" ? (
      <Link to={(props as { to: string }).to} className={className}>
        {content}
      </Link>
    ) : (
      <button type="button" onClick={props.onClick} className={className}>
        {content}
      </button>
    );

  if (expanded) return wrapped;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{wrapped}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}