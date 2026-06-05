import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  Target,
  Landmark,
  LineChart,
  Tags,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import pocketLogoWhite from "@/assets/pocket-logo-white.png";
import { HeaderMonthSelector } from "./HeaderMonthSelector";

type NavChild = {
  label: string;
  to: string;
  icon?: LucideIcon;
};

type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  children?: NavChild[];
};

/**
 * Persistent left rail.
 * - Collapsed: logo at top, then group icons in the SAME vertical positions
 *   they occupy when expanded (no shifting). Workspace icons sit below,
 *   then the expand toggle (a slim chevron) at the very bottom.
 * - Expanded: grouped navigation with a thin vertical guide line under each
 *   group and a very subtle translucent highlight on the active route.
 */
export function DataRail() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  const isActive = (path: string) => {
    const [base] = path.split("?");
    return location.pathname === base || location.pathname.startsWith(base + "/");
  };

  const groups: NavGroup[] = [
    {
      key: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      children: [
        { label: "Monthly", to: "/dashboard" },
        { label: "History", to: "/history" },
        { label: "Calendar", to: "/calendar" },
      ],
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
      children: [
        { label: "Planned payments", to: "/planning/planned" },
        { label: "Budgets", to: "/planning/budgets" },
      ],
    },
  ];

  const workspace: NavChild[] = [
    { label: "Bank statements", to: "/my-data?tab=bank", icon: Landmark },
    { label: "Investment files", to: "/my-data?tab=investments", icon: LineChart },
    { label: "Categories & rules", to: "/categories", icon: Tags },
  ];

  const isWorkspaceActive = (item: NavChild) => {
    if (item.to.startsWith("/categories")) {
      return location.pathname === "/categories";
    }
    if (location.pathname !== "/my-data") return false;
    const wantTab = item.to.includes("investments") ? "investments" : "bank";
    const currentTab = new URLSearchParams(location.search).get("tab") ?? "bank";
    return currentTab === wantTab;
  };

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
        </div>

        {/* Navigation — identical icon column and vertical rhythm in both states */}
        <nav className="flex-1 overflow-y-auto mt-6 px-3">
          <NavigationGroups groups={groups} expanded={expanded} isActive={isActive} />
        </nav>

        {/* Workspace cluster */}
        <WorkspaceLinks
          items={workspace}
          expanded={expanded}
          isWorkspaceActive={isWorkspaceActive}
        />

        {/* Expand / collapse — bottom of rail, slim chevron */}
        <div
          className={cn(
            "mt-4 px-3 pt-3",
            expanded ? "flex justify-end" : "flex justify-center",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
                className="w-8 h-8 rounded-md flex items-center justify-center text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              >
                {expanded ? (
                  <ChevronLeft className="w-4 h-4" strokeWidth={2} />
                ) : (
                  <ChevronRight className="w-4 h-4" strokeWidth={2} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {expanded ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}

/**
 * Collapsed-state group icons. Spacing is computed so each group icon sits
 * roughly in the vertical center of its expanded counterpart, preventing
 * the icons from "jumping" when the rail toggles.
 *
 * In expanded mode each group renders:
 *   - Header row (~28px tall) + children (each ~32px) + space-y-5 (20px) gap.
 * We approximate by placing each collapsed icon at a fixed height matching
 * the header row, and reserving extra space below proportional to children
 * count, so icon centers align with their expanded headers.
 */
function NavigationGroups({
  groups,
  expanded,
  isActive,
}: {
  groups: NavGroup[];
  expanded: boolean;
  isActive: (path: string) => boolean;
}) {
  const HEADER = 40;
  const CHILD = 32;
  const GAP = 20;

  return (
    <div className="relative">
      {groups.map((group, idx) => {
        const Icon = group.icon;
        const target = group.to ?? group.children?.[0]?.to ?? "#";
        const active =
          Boolean(group.to && isActive(group.to)) ||
          Boolean(group.children?.some((child) => isActive(child.to)));
        const childrenCount = group.children?.length ?? 0;
        const blockHeight =
          HEADER + childrenCount * CHILD + (idx < groups.length - 1 ? GAP : 0);

        return (
          <div key={group.key} style={{ height: blockHeight }} className="w-full">
            <div className="grid h-10 grid-cols-[72px_minmax(0,1fr)] items-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={target}
                    aria-label={group.label}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "col-start-1 mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active
                        ? "text-primary-foreground bg-primary-foreground/10"
                        : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={8}>
                    {group.label}
                  </TooltipContent>
                )}
              </Tooltip>

              {expanded && (
                <Link
                  to={target}
                  className={cn(
                    "min-w-0 rounded-md px-2 py-1.5 text-sm font-semibold transition-colors",
                    active
                      ? "text-primary-foreground"
                      : "text-primary-foreground/85 hover:text-primary-foreground",
                  )}
                >
                  <span className="block truncate">{group.label}</span>
                </Link>
              )}
            </div>

            {expanded && group.children && (
              <div className="ml-[36px] border-l border-primary-foreground/15 pl-[44px]">
                {group.children.map((child) => {
                  const childActive = isActive(child.to);
                  return (
                    <Link
                      key={child.to}
                      to={child.to}
                      className={cn(
                        "flex h-8 items-center rounded-md px-0 text-sm transition-colors",
                        childActive
                          ? "bg-primary-foreground/10 text-primary-foreground font-medium"
                          : "text-primary-foreground/75 hover:text-primary-foreground hover:bg-primary-foreground/5",
                      )}
                    >
                      <span className="truncate">{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WorkspaceLinks({
  items,
  expanded,
  isWorkspaceActive,
}: {
  items: NavChild[];
  expanded: boolean;
  isWorkspaceActive: (item: NavChild) => boolean;
}) {
  return (
    <div className="mt-4 px-3 pt-4 border-t border-primary-foreground/15">
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon!;
          const active = isWorkspaceActive(item);
          return (
            <div
              key={item.to}
              className="grid h-10 grid-cols-[72px_minmax(0,1fr)] items-center"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    to={item.to}
                    aria-label={item.label}
                    className={cn(
                      "col-start-1 mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors",
                      active
                        ? "text-primary-foreground bg-primary-foreground/10"
                        : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </Link>
                </TooltipTrigger>
                {!expanded && (
                  <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                  </TooltipContent>
                )}
              </Tooltip>

              {expanded && (
                <Link
                  to={item.to}
                  className={cn(
                    "min-w-0 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary-foreground/10 text-primary-foreground font-medium"
                      : "text-primary-foreground/75 hover:text-primary-foreground hover:bg-primary-foreground/5",
                  )}
                >
                  <span className="block truncate">{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}