import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { useGranularity } from "@/hooks/useGranularity";
import { useLocalization } from "@/hooks/useLocalization";
import { formatPeriodLabel } from "@/lib/analytics";
import { GranularityToggle } from "./GranularityToggle";
import { EmptyStateBanner } from "./EmptyStateBanner";

const PILL = "flex items-center gap-[6px] text-[13px] font-medium text-foreground bg-card border border-border rounded-full px-[14px] py-2 cursor-pointer whitespace-nowrap select-none hover:bg-muted/40 transition-colors";

function MonthPill() {
  const { formatMonth } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthSelection();
  if (availableMonths.length === 0) return null;

  const idx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const hasOlder = idx < availableMonths.length - 1;
  const hasNewer = idx > 0;
  const label = selectedMonth ? formatMonth(selectedMonth + "-01") : "–";

  return (
    <span className={PILL}>
      <button type="button" onClick={() => hasOlder && setSelectedMonth(availableMonths[idx + 1])} disabled={!hasOlder} aria-label="Previous month" className="disabled:opacity-30 hover:opacity-60 transition-opacity">
        <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
      <Calendar className="w-[14px] h-[14px] shrink-0 text-muted-foreground" strokeWidth={2} />
      <span className="capitalize min-w-[80px] text-center">{label}</span>
      <button type="button" onClick={() => hasNewer && setSelectedMonth(availableMonths[idx - 1])} disabled={!hasNewer} aria-label="Next month" className="disabled:opacity-30 hover:opacity-60 transition-opacity">
        <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
    </span>
  );
}

function WeekPill() {
  const { i18n } = useTranslation();
  const { selectedPeriod, setSelectedPeriod, availablePeriods } = usePeriodSelection();
  const weeks = availablePeriods.week;
  if (weeks.length === 0) return null;

  const selected = selectedPeriod.week;
  const idx = selected ? weeks.indexOf(selected) : -1;
  const hasOlder = idx > 0;
  const hasNewer = idx >= 0 && idx < weeks.length - 1;
  const label = selected ? formatPeriodLabel(selected, "week", i18n.language) : "–";

  return (
    <span className={PILL}>
      <button type="button" onClick={() => hasOlder && setSelectedPeriod("week", weeks[idx - 1])} disabled={!hasOlder} aria-label="Previous week" className="disabled:opacity-30 hover:opacity-60 transition-opacity">
        <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
      <Calendar className="w-[14px] h-[14px] shrink-0 text-muted-foreground" strokeWidth={2} />
      <span className="capitalize min-w-[80px] text-center">{label}</span>
      <button type="button" onClick={() => hasNewer && setSelectedPeriod("week", weeks[idx + 1])} disabled={!hasNewer} aria-label="Next week" className="disabled:opacity-30 hover:opacity-60 transition-opacity">
        <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
    </span>
  );
}

function YearPill() {
  const { selectedPeriod, setSelectedPeriod, availablePeriods } = usePeriodSelection();
  const years = availablePeriods.year;
  if (years.length === 0) return null;

  const selected = selectedPeriod.year;
  const idx = selected ? years.indexOf(selected) : -1;
  const hasOlder = idx > 0;
  const hasNewer = idx >= 0 && idx < years.length - 1;
  const label = selected ?? "–";

  return (
    <span className={PILL}>
      <button type="button" onClick={() => hasOlder && setSelectedPeriod("year", years[idx - 1])} disabled={!hasOlder} aria-label="Previous year" className="disabled:opacity-30 hover:opacity-60 transition-opacity">
        <ChevronLeft className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
      <Calendar className="w-[14px] h-[14px] shrink-0 text-muted-foreground" strokeWidth={2} />
      <span className="min-w-[40px] text-center">{label}</span>
      <button type="button" onClick={() => hasNewer && setSelectedPeriod("year", years[idx + 1])} disabled={!hasNewer} aria-label="Next year" className="disabled:opacity-30 hover:opacity-60 transition-opacity">
        <ChevronRight className="w-[14px] h-[14px]" strokeWidth={2} />
      </button>
    </span>
  );
}

function HistoryControls() {
  const [granularity, setGranularity] = useGranularity();
  return <GranularityToggle value={granularity} onChange={setGranularity} />;
}

export function DashboardGreeting() {
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("dashboard");
  const { profile } = useProfile();

  const tab = searchParams.get("tab") ?? "month";
  const firstName = profile?.first_name?.trim() || "";
  const subtitleKey = (["month", "week", "year", "history"] as const).includes(tab as never)
    ? `greeting.subtitle.${tab}`
    : "greeting.subtitle.month";

  return (
    <div className="hidden md:block px-[30px] pt-7 pb-1">
      <div className="flex items-start justify-between">
        <div>
          {firstName && (
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-foreground">
              {t("greeting.hi", { name: firstName })}
            </h1>
          )}
          <p className="text-[13.5px] text-muted-foreground mt-[3px]">
            {t(subtitleKey)}
          </p>
        </div>
        <div className="flex items-center gap-2 mt-[2px]">
          <EmptyStateBanner />
          <span className={PILL}>
            <SlidersHorizontal className="w-[14px] h-[14px]" strokeWidth={2} />
            {t("greeting.filter")}
          </span>
          {tab === "month" && <MonthPill />}
          {tab === "week" && <WeekPill />}
          {tab === "year" && <YearPill />}
          {tab === "history" && <HistoryControls />}
        </div>
      </div>
    </div>
  );
}
