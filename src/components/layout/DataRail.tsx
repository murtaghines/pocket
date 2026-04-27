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
};

type NavGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  to?: string;
  children?: NavChild[];
};

/**
 * Persistent left rail. Collapsed = logo + 3 group icons (Dashboard,
 * Investments, Planning), no borders/cards, same vertical rhythm as
 * the expanded state. Expanded = full grouped navigation with a thin
 * vertical guide line under each group, and a very subtle translucent
 * highlight on the active route — matching the reference UI.
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
    { label: "My Data — Dashboard", to: "/my-data?tab=bank" },
    { label: "My Data — Investments", to: "/my-data?tab=investments" },
  ];

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
        {/* Top: brand + collapse toggle */}
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
              className="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expand toggle when collapsed — kept subtle, no border */}
        {!expanded && (
          <div className="flex justify-center mt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  aria-label="Expand navigation"
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-primary-foreground/60 hover:bg-primary-foreground/10 transition-colors"
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
            <div className="space-y-5">
              {groups.map((group) => (
                <ExpandedGroup
                  key={group.key}
                  group={group}
                  isActive={isActive}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-5">
              {groups.map((group) => {
                const Icon = group.icon;
                const target =
                  group.to ?? group.children?.[0]?.to ?? "#";
                const active =
                  (group.to && isActive(group.to)) ||
                  group.children?.some((c) => isActive(c.to)) ||
                  false;
                return (
                  <Tooltip key={group.key}>
                    <TooltipTrigger asChild>
                      <Link
                        to={target}
                        aria-label={group.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                          active
                            ? "text-primary-foreground"
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
                );
              })}
            </div>
          )}
        </nav>

        {/* Workspace cluster — only data shortcuts */}
        {expanded ? (
          <div className="mt-4 px-3">
            <div className="flex items-center gap-2 px-3 mb-1.5 text-primary-foreground/70">
              <FileSpreadsheet className="w-4 h-4" />
              <span className="text-xs font-semibold tracking-tight uppercase">
                Workspace
              </span>
            </div>
            <div className="ml-3 border-l border-primary-foreground/15 pl-3 space-y-0.5">
              {workspace.map((item) => {
                const active =
                  location.pathname === "/my-data" &&
                  location.search.includes(item.to.split("?")[1] ?? "");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "block py-1.5 pr-2 text-sm rounded-md transition-colors",
                      active
                        ? "text-primary-foreground bg-primary-foreground/10 px-2 font-medium"
                        : "text-primary-foreground/75 hover:text-primary-foreground px-2",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/my-data?tab=bank"
                  aria-label="My Data"
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                    location.pathname === "/my-data"
                      ? "text-primary-foreground"
                      : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10",
                  )}
                >
                  <FileSpreadsheet className="w-5 h-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                My Data
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </aside>
    </TooltipProvider>
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