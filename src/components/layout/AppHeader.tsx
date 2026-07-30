import { ReactNode } from "react";
import { HeaderMonthSelector } from "./HeaderMonthSelector";
import { HeaderGranularitySelector } from "./HeaderGranularitySelector";
import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { TopNav } from "./TopNav";
import { HeaderUserMenu } from "./HeaderUserMenu";

interface AppHeaderProps {
  /** Page title shown at the left (e.g. "Dashboard"). */
  title?: string;
  /** Show the month + granularity selectors (only meaningful on the month-scoped pages). */
  showSelectors?: boolean;
  /** A page-specific selector/filter rendered next to the title (e.g. the Data section toggle). */
  leftExtra?: ReactNode;
}

/**
 * The single desktop top bar used by every page so the chrome is identical everywhere. Layout is
 * always: title · optional selector/filter · centred static pill nav · notifications · theme · user.
 * Same height, background and order on all views.
 */
export function AppHeader({ title, showSelectors = true, leftExtra }: AppHeaderProps) {
  return (
    <header className="hidden md:flex sticky top-0 z-30 h-[84px] items-center gap-4 px-[30px] bg-background/85 backdrop-blur-[10px]">
      {/* Left cluster: title + selector/filter (flex-1 so the centre pill stays centred) */}
      <div className="flex flex-1 items-center gap-[14px] min-w-0">
        {title && (
          <span className="text-[20px] font-semibold tracking-[-0.01em] text-foreground whitespace-nowrap">
            {title}
          </span>
        )}
        {leftExtra}
        {showSelectors && (
          <>
            <HeaderMonthSelector />
            <HeaderGranularitySelector />
            <EmptyStateBanner />
          </>
        )}
      </div>

      {/* Centre: the fixed-width static Pocket pill nav */}
      <div className="shrink-0">
        <TopNav />
      </div>

      {/* Right cluster: notifications · theme · user (flex-1 to mirror the left) */}
      <div className="flex flex-1 items-center justify-end min-w-0">
        <HeaderUserMenu />
      </div>
    </header>
  );
}
