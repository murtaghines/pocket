import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  PiggyBank,
  Target,
  Landmark,
  LineChart,
  Tags,
  ChevronRight,
  ChevronLeft,
  User,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AsteriskMark, Wordmark } from "@/components/brand";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const RAIL_WIDTH_COLLAPSED = "104px";
export const RAIL_WIDTH_EXPANDED = "264px";

/** Sharp triangular "folded corner" accent — pinned to the rail's bottom-right corner */
function PocketFold() {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 34 34"
      className="absolute bottom-0 right-0 pointer-events-none"
      aria-hidden="true"
    >
      <polygon points="34,0 34,34 0,34" fill="hsl(216 100% 70%)" />
      <line x1="34" y1="0" x2="0" y2="34" stroke="rgba(10,42,94,0.16)" strokeWidth="1" />
    </svg>
  );
}

const MAIN_NAV = [
  { key: "dashboard",   label: "Dashboard",   icon: LayoutDashboard, to: "/dashboard"              },
  { key: "history",     label: "History",     icon: TrendingUp,      to: "/history"                },
  { key: "investments", label: "Investments", icon: PiggyBank,       to: "/investments"            },
  { key: "planning",    label: "Planning",    icon: Target,          to: "/planning"               },
] as const;

const DATA_NAV = [
  { key: "bank",        label: "Bank statements",    icon: Landmark,  to: "/my-data?tab=bank"        },
  { key: "invfiles",    label: "Investment files",   icon: LineChart, to: "/my-data?tab=investments" },
  { key: "categories",  label: "Categories & rules", icon: Tags,      to: "/categories"              },
] as const;

interface NavRowProps {
  label: string;
  icon: LucideIcon;
  to: string;
  active: boolean;
  expanded: boolean;
  group: string;
  small?: boolean;
}

function NavRow({ label, icon: Icon, to, active, expanded, group, small = false }: NavRowProps) {
  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={to}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex items-center justify-center transition-colors rounded-[12px]",
              small ? "min-h-[44px]" : "min-h-[50px]",
              active ? "bg-white/[0.18]" : "hover:bg-white/10",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center transition-all",
                small ? "w-[30px] h-[30px]" : "w-[44px] h-[44px]",
                active ? "text-white" : "text-white/[0.55]",
              )}
            >
              <Icon className={small ? "w-[19px] h-[19px]" : "w-[22px] h-[22px]"} strokeWidth={active ? 2.4 : 2} />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={14} className="flex flex-col gap-0.5 py-2">
          <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {group}
          </span>
          <span className="text-sm font-semibold">{label}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-[12px] transition-colors rounded-[12px]",
        small ? "min-h-[44px]" : "min-h-[48px]",
        active ? "bg-white/[0.18]" : "hover:bg-white/10",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-[28px] h-[28px] shrink-0 transition-all",
          active ? "text-white" : "text-white/[0.55]",
        )}
      >
        <Icon className={small ? "w-[19px] h-[19px]" : "w-[20px] h-[20px]"} strokeWidth={active ? 2.4 : 2} />
      </div>
      <span
        className={cn(
          "text-[14.5px] whitespace-nowrap",
          active ? "font-semibold text-white" : "font-normal text-white/70",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function AccountRow({ expanded }: { expanded: boolean }) {
  const { pathname } = useLocation();
  const active = pathname === "/account";

  if (!expanded) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to="/account"
            className={cn(
              "flex items-center justify-center mt-2.5 rounded-[13px] min-h-[50px] transition-colors",
              active ? "bg-white/[0.18]" : "hover:bg-white/10",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-[44px] h-[44px]",
                active ? "text-white" : "text-white/[0.55]",
              )}
            >
              <User className="w-[21px] h-[21px]" strokeWidth={active ? 2.4 : 2} />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={14}>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold">Account</span>
            <span className="text-xs text-muted-foreground">Overview, accounts &amp; preferences</span>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      to="/account"
      className={cn(
        "flex items-center gap-3 mt-3 px-[12px] rounded-[13px] min-h-[50px] transition-colors",
        active ? "bg-white/[0.18]" : "hover:bg-white/10",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-[28px] h-[28px] shrink-0",
          active ? "text-white" : "text-white/[0.55]",
        )}
      >
        <User className="w-[20px] h-[20px]" strokeWidth={active ? 2.4 : 2} />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-[13.5px] font-semibold text-white">
          Account
        </span>
        <span className="text-[11px] text-white/60 whitespace-nowrap">
          Overview &amp; preferences
        </span>
      </div>
    </Link>
  );
}

export function DataRail() {
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);

  // Push sidebar width as a CSS variable so DashboardLayout / full-bleed pages
  // can size their left padding to exactly match the fixed rail.
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--rail-width",
      expanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH_COLLAPSED,
    );
    return () => {
      document.documentElement.style.removeProperty("--rail-width");
    };
  }, [expanded]);

  const isActive = (path: string) => {
    const base = path.split("?")[0];
    return location.pathname === base || location.pathname.startsWith(base + "/");
  };

  const isDataActive = (to: string) => {
    if (to.startsWith("/categories")) return location.pathname === "/categories";
    if (location.pathname !== "/my-data") return false;
    const wantTab = to.includes("investments") ? "investments" : "bank";
    return (new URLSearchParams(location.search).get("tab") ?? "bank") === wantTab;
  };

  return (
    <TooltipProvider delayDuration={200}>
      {/* Full-bleed rail: flush to the viewport's left edge, top to bottom,
          always fixed regardless of page scroll height. Square corners —
          no outer gutter, no rounded card — the blue fills the entire side. */}
      <aside
        className={cn(
          "hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col overflow-hidden",
          "bg-primary text-white transition-[width] duration-[220ms] ease-out",
          expanded ? "p-[20px_18px]" : "p-4",
        )}
        style={{
          width: expanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH_COLLAPSED,
          boxShadow: "4px 0 24px -8px rgba(20,80,210,.35)",
        }}
        aria-label="Primary navigation"
      >
        {/* ── Logo zone ── */}
        {!expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-label="Expand navigation"
            className="flex flex-col items-center gap-1 pb-3 cursor-pointer group self-stretch"
          >
            <AsteriskMark size={28} />
            <ChevronRight
              className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              strokeWidth={2}
            />
          </button>
        ) : (
          <div className="flex items-center justify-between mb-4">
            <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
              <AsteriskMark size={26} />
              <Wordmark className="text-[21px] text-white whitespace-nowrap" />
            </Link>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              aria-label="Collapse navigation"
              className="w-[30px] h-[30px] flex items-center justify-center rounded-[9px] bg-white/10 text-white/80 hover:bg-white/20 transition-colors shrink-0"
            >
              <ChevronLeft className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
          </div>
        )}

        {/* ── MAIN nav ── */}
        <nav className="mt-1.5 flex flex-col gap-1">
          {expanded && (
            <div className="text-[10px] font-bold tracking-[0.12em] text-white/50 uppercase px-[12px] mb-1.5">
              MAIN
            </div>
          )}
          {MAIN_NAV.map((item) => (
            <NavRow
              key={item.key}
              label={item.label}
              icon={item.icon}
              to={item.to}
              active={isActive(item.to)}
              expanded={expanded}
              group="Main"
            />
          ))}
        </nav>

        <div className="flex-1 min-h-4" />

        {/* ── DATA · uploads panel ── */}
        <div
          className={cn(
            "rounded-[18px] flex flex-col bg-white/10 border border-white/[0.13]",
            expanded ? "p-3 gap-1" : "p-[10px_6px] gap-1.5",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-1.5 px-1.5 mb-0.5",
              expanded ? "justify-start" : "justify-center",
            )}
          >
            <Upload className="w-3.5 h-3.5 text-white/[0.62] shrink-0" strokeWidth={2} />
            {expanded && (
              <span className="text-[10px] font-bold tracking-[0.1em] text-white/[0.62] uppercase whitespace-nowrap">
                Data · uploads
              </span>
            )}
          </div>
          {DATA_NAV.map((item) => (
            <NavRow
              key={item.key}
              label={item.label}
              icon={item.icon}
              to={item.to}
              active={isDataActive(item.to)}
              expanded={expanded}
              group="Data"
              small
            />
          ))}
        </div>

        {/* ── Account footer ── */}
        <AccountRow expanded={expanded} />

        {/* ── Decorative folded corner ── */}
        <PocketFold />
      </aside>
    </TooltipProvider>
  );
}
