import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  PiggyBank,
  Target,
  Landmark,
  LineChart,
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
  ];

  const isWorkspaceActive = (item: NavChild) => {
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
function CollapsedGroups({
  groups,
  isActive,
}: {
  groups: NavGroup[];
  isActive: (path: string) => boolean;
}) {
  // Heights mirror expanded layout: header ≈ 28px, each child row ≈ 32px,
  // group gap (space-y-5) ≈ 20px.
  const HEADER = 28;
  const CHILD = 32;
  const GAP = 20;

  return (
    <div className="relative flex flex-col items-center">
      {groups.map((group, idx) => {
        const Icon = group.icon;
        const target = group.to ?? group.children?.[0]?.to ?? "#";
        const active =
          (group.to && isActive(group.to)) ||
          group.children?.some((c) => isActive(c.to)) ||
          false;
        const childrenCount = group.children?.length ?? 0;
        // Space reserved for this group: header + its children rows + gap.
        const blockHeight =
          HEADER + childrenCount * CHILD + (idx < groups.length - 1 ? GAP : 0);

        return (
          <div
            key={group.key}
            style={{ height: blockHeight }}
            className="w-full flex flex-col items-center"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to={target}
                  aria-label={group.label}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                    active
                      ? "text-primary-foreground bg-primary-foreground/10"
                      : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10",
                  )}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {group.label}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
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
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          active
            ? "bg-primary-foreground/10 text-primary-foreground"
            : "text-primary-foreground/85 hover:bg-primary-foreground/5",
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{group.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-3 mb-1.5 text-primary-foreground/85">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-semibold tracking-tight">
          {group.label}
        </span>
      </div>
      <div className="ml-3 border-l border-primary-foreground/15 pl-3 space-y-0.5">
        {group.children.map((child) => {
          const active = isActive(child.to);
          return (
            <Link
              key={child.to}
              to={child.to}
              className={cn(
                "block py-1.5 px-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary-foreground/10 text-primary-foreground font-medium"
                  : "text-primary-foreground/75 hover:text-primary-foreground hover:bg-primary-foreground/5",
              )}
            >
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}