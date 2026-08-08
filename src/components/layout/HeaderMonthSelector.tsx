import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { useLocalization } from "@/hooks/useLocalization";

interface HeaderMonthSelectorProps {
  variant?: "default" | "onPrimary";
}

export function HeaderMonthSelector({ variant = "default" }: HeaderMonthSelectorProps) {
  const location = useLocation();
  const { formatMonth } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthSelection();

  if (location.pathname !== "/dashboard") return null;
  if (availableMonths.length === 0) return null;

  const currentIdx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const hasOlder = currentIdx < availableMonths.length - 1;
  const hasNewer = currentIdx > 0;

  const label = selectedMonth ? formatMonth(selectedMonth + "-01") : "–";
  const onBlue = variant === "onPrimary";

  return (
    <span
      className={cn(
        "flex items-center gap-[6px] text-[13px] font-medium rounded-full py-[7px] px-[13px] whitespace-nowrap select-none",
        onBlue
          ? "text-white bg-white/15"
          : "text-foreground bg-card shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={() => hasOlder && setSelectedMonth(availableMonths[currentIdx + 1])}
        disabled={!hasOlder}
        aria-label="Previous month"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronLeft className="w-[15px] h-[15px]" strokeWidth={2} />
      </button>
      <Calendar className={cn("w-[14px] h-[14px] shrink-0", onBlue ? "text-white/60" : "text-muted-foreground")} strokeWidth={2} />
      <span className="capitalize min-w-[90px] text-center">{label}</span>
      <button
        type="button"
        onClick={() => hasNewer && setSelectedMonth(availableMonths[currentIdx - 1])}
        disabled={!hasNewer}
        aria-label="Next month"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronRight className="w-[15px] h-[15px]" strokeWidth={2} />
      </button>
    </span>
  );
}
