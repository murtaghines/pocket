import { ReactNode } from "react";
import { HeaderMonthSelector } from "./HeaderMonthSelector";
import { HeaderWeekSelector } from "./HeaderWeekSelector";
import { HeaderYearSelector } from "./HeaderYearSelector";
import { HeaderGranularitySelector } from "./HeaderGranularitySelector";
import { EmptyStateBanner } from "@/components/dashboard/EmptyStateBanner";
import { PrimaryNavBar } from "./PrimaryNavBar";
import { SecondaryNavBar } from "./SecondaryNavBar";

interface AppHeaderProps {
  /** Page title shown at the left (e.g. "Dashboard"). */
  title?: string;
  /** Show the period selectors (only meaningful on dashboard's tabs). */
  showSelectors?: boolean;
  /** A page-specific selector/filter rendered next to the title (e.g. the Data section toggle). */
  leftExtra?: ReactNode;
}

/**
 * The app's desktop chrome: a solid-blue PrimaryNavBar (section nav, brand mark, user cluster),
 * a lighter-blue SecondaryNavBar underneath (the active section's sub-tabs, when it has more than
 * one), and a title/selector row below both. Mobile uses MobileNav instead — self-contained.
 */
export function AppHeader({ title, showSelectors = true, leftExtra }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30">
      <PrimaryNavBar />
      <SecondaryNavBar />
      <div className="hidden md:flex items-center gap-[14px] h-[64px] px-[30px] bg-background/85 backdrop-blur-[10px] min-w-0">
        {title && (
          <span className="font-title text-[20px] font-medium lowercase tracking-[0.05em] text-foreground whitespace-nowrap">
            {title}
          </span>
        )}
        {leftExtra}
        {showSelectors && (
          <>
            <HeaderMonthSelector />
            <HeaderWeekSelector />
            <HeaderYearSelector />
            <HeaderGranularitySelector />
            <EmptyStateBanner />
          </>
        )}
      </div>
    </header>
  );
}
