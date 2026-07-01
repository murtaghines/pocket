import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { useLocalization } from "@/hooks/useLocalization";

export function HeaderMonthSelector() {
  const location = useLocation();
  const { formatMonth } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthSelection();

  if (location.pathname !== "/dashboard") return null;
  if (availableMonths.length === 0) return null;

  const currentIdx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < availableMonths.length - 1;

  const label = selectedMonth ? formatMonth(selectedMonth + "-01") : "–";

  return (
    <span
      className="flex items-center gap-[6px] text-[13px] font-[500] text-[#3b465c] bg-white rounded-full py-[7px] px-[13px] whitespace-nowrap select-none"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,.05)" }}
    >
      <Calendar className="w-[14px] h-[14px] text-[#9aa3b2] shrink-0" strokeWidth={2} />
      <button
        type="button"
        onClick={() => hasPrev && setSelectedMonth(availableMonths[currentIdx - 1])}
        disabled={!hasPrev}
        aria-label="Previous month"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronLeft className="w-[15px] h-[15px]" strokeWidth={2} />
      </button>
      <span className="capitalize min-w-[90px] text-center">{label}</span>
      <button
        type="button"
        onClick={() => hasNext && setSelectedMonth(availableMonths[currentIdx + 1])}
        disabled={!hasNext}
        aria-label="Next month"
        className="disabled:opacity-30 hover:opacity-60 transition-opacity"
      >
        <ChevronRight className="w-[15px] h-[15px]" strokeWidth={2} />
      </button>
    </span>
  );
}
