import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { getActiveSection, getActiveTabKey } from "@/config/navigation";

interface HeaderYearSelectorProps {
  variant?: "default" | "onPrimary";
}

/** Prev/next year picker, shown only on the dashboard's "year" tab — mirrors HeaderMonthSelector. */
export function HeaderYearSelector({ variant = "default" }: HeaderYearSelectorProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { selectedPeriod, setSelectedPeriod, availablePeriods } = usePeriodSelection();

  const section = getActiveSection(location.pathname);
  const activeTab = getActiveTabKey(section, searchParams);
  if (section?.key !== "dashboard" || activeTab !== "year") return null;

  const availableYears = availablePeriods.year;
  if (availableYears.length === 0) return null;

  const selectedYear = selectedPeriod.year;
  const currentIdx = selectedYear ? availableYears.indexOf(selectedYear) : -1;
  // availableYears is ascending (oldest first) — "newer" is a higher index.
  const hasOlder = currentIdx > 0;
  const hasNewer = currentIdx >= 0 && currentIdx < availableYears.length - 1;

  const label = selectedYear ?? "–";
  const onBlue = variant === "onPrimary";

  return (
    <span
      className={cn(
        "flex items-center gap-[5px] text-[12px] font-medium rounded-full py-[4px] px-[10px] whitespace-nowrap select-none",
        onBlue ? "text-white bg-white/15" : "text-foreground bg-card shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={() => hasOlder && setSelectedPeriod("year", availableYears[currentIdx - 1])}
        disabled={!hasOlder}
        aria-label="Previous year"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
      <Calendar className={cn("w-[13px] h-[13px] shrink-0", onBlue ? "text-white/60" : "text-muted-foreground")} strokeWidth={2} />
      <span className="min-w-[40px] text-center">{label}</span>
      <button
        type="button"
        onClick={() => hasNewer && setSelectedPeriod("year", availableYears[currentIdx + 1])}
        disabled={!hasNewer}
        aria-label="Next year"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
    </span>
  );
}
