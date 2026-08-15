import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { formatPeriodLabel } from "@/lib/analytics";
import { getActiveSection, getActiveTabKey } from "@/config/navigation";

interface HeaderWeekSelectorProps {
  variant?: "default" | "onPrimary";
}

/** Prev/next week picker, shown only on the dashboard's "week" tab — mirrors HeaderMonthSelector. */
export function HeaderWeekSelector({ variant = "default" }: HeaderWeekSelectorProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const { selectedPeriod, setSelectedPeriod, availablePeriods } = usePeriodSelection();

  const section = getActiveSection(location.pathname);
  const activeTab = getActiveTabKey(section, searchParams);
  if (section?.key !== "dashboard" || activeTab !== "week") return null;

  const availableWeeks = availablePeriods.week;
  if (availableWeeks.length === 0) return null;

  const selectedWeek = selectedPeriod.week;
  const currentIdx = selectedWeek ? availableWeeks.indexOf(selectedWeek) : -1;
  // availableWeeks is ascending (oldest first), unlike availableMonths — so "newer" is a higher index.
  const hasOlder = currentIdx > 0;
  const hasNewer = currentIdx >= 0 && currentIdx < availableWeeks.length - 1;

  const label = selectedWeek ? formatPeriodLabel(selectedWeek, "week", i18n.language) : "–";
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
        onClick={() => hasOlder && setSelectedPeriod("week", availableWeeks[currentIdx - 1])}
        disabled={!hasOlder}
        aria-label="Previous week"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
      <Calendar className={cn("w-[13px] h-[13px] shrink-0", onBlue ? "text-white/60" : "text-muted-foreground")} strokeWidth={2} />
      <span className="capitalize min-w-[80px] text-center">{label}</span>
      <button
        type="button"
        onClick={() => hasNewer && setSelectedPeriod("week", availableWeeks[currentIdx + 1])}
        disabled={!hasNewer}
        aria-label="Next week"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
    </span>
  );
}
