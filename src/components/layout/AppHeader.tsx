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
}

/**
 * The single desktop top bar used by every page so the chrome is identical everywhere:
 * left = page title (+ optional month/granularity selectors), centre = the fixed Pocket pill nav,
 * right = the shared user utilities. Same height, background and layout on all views.
 */
export function AppHeader({ title, showSelectors = true }: AppHeaderProps) {
  return (
    <header className="hidden md:flex sticky top-0 z-30 h-[74px] items-center gap-4 px-[30px] bg-background/85 backdrop-blur-[10px]">
      {/* Left cluster (flex-1 so the centre pill stays centred) */}
      <div className="flex flex-1 items-center gap-[14px] min-w-0">
        {title && (
          <span className="text-[20px] font-semibold tracking-[-0.01em] text-foreground whitespace-nowrap">
            {title}
          </span>
        )}
        {showSelectors && (
          <>
            <HeaderMonthSelector />
            <HeaderGranularitySelector />
            <EmptyStateBanner />
          </>
        )}
      </div>

      {/* Centre: the fixed-width Pocket pill nav */}
      <div className="shrink-0">
        <TopNav />
      </div>

      {/* Right cluster (flex-1 to mirror the left) */}
      <div className="flex flex-1 items-center justify-end min-w-0">
        <HeaderUserMenu />
      </div>
    </header>
  );
}
