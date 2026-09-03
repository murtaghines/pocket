import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { useGranularity } from "@/hooks/useGranularity";
import { useLocalization } from "@/hooks/useLocalization";
import { GranularityToggle } from "./GranularityToggle";
import { EmptyStateBanner } from "./EmptyStateBanner";

const PILL = "flex items-center gap-[6px] text-[13px] font-medium text-[#414750] bg-card rounded-[10px] px-[13px] py-[8px] cursor-pointer whitespace-nowrap select-none hover:bg-muted/40 transition-colors shadow-[0_1px_2px_rgba(16,24,40,.05)]";

const NAV_PILL = "flex items-center bg-card rounded-[10px] p-[5px] shadow-[0_1px_2px_rgba(16,24,40,.05)]";

function MonthPill() {
  const { formatMonth } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths } = useMonthSelection();
  if (availableMonths.length === 0) return null;

  const idx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const hasOlder = idx < availableMonths.length - 1;
  const hasNewer = idx > 0;
  const label = selectedMonth ? formatMonth(selectedMonth + "-01") : "–";

  return (
    <span className={NAV_PILL}>
      <button type="button" onClick={() => hasOlder && setSelectedMonth(availableMonths[idx + 1])} disabled={!hasOlder} aria-label="Previous month" className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] disabled:opacity-30 hover:bg-muted/60 transition-colors">
        <ChevronLeft className="w-[14px] h-[14px] text-[#414750]" strokeWidth={2.2} />
      </button>
      <span className="capitalize min-w-[88px] text-center text-[13px] font-medium text-[#414750]">{label}</span>
      <button type="button" onClick={() => hasNewer && setSelectedMonth(availableMonths[idx - 1])} disabled={!hasNewer} aria-label="Next month" className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] disabled:opacity-30 hover:bg-muted/60 transition-colors">
        <ChevronRight className="w-[14px] h-[14px] text-[#414750]" strokeWidth={2.2} />
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
    <span className={NAV_PILL}>
      <button type="button" onClick={() => hasOlder && setSelectedPeriod("year", years[idx - 1])} disabled={!hasOlder} aria-label="Previous year" className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] disabled:opacity-30 hover:bg-muted/60 transition-colors">
        <ChevronLeft className="w-[14px] h-[14px] text-[#414750]" strokeWidth={2.2} />
      </button>
      <span className="min-w-[40px] text-center text-[13px] font-medium text-[#414750]">{label}</span>
      <button type="button" onClick={() => hasNewer && setSelectedPeriod("year", years[idx + 1])} disabled={!hasNewer} aria-label="Next year" className="flex items-center justify-center w-[26px] h-[26px] rounded-[7px] disabled:opacity-30 hover:bg-muted/60 transition-colors">
        <ChevronRight className="w-[14px] h-[14px] text-[#414750]" strokeWidth={2.2} />
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
  const { formatMonth, formatCurrency } = useLocalization();
  const { selectedMonth, openingBalance, transactionCount } = useMonthSelection();

  const tab = searchParams.get("tab") ?? "month";

  const title = tab === "month" && selectedMonth
    ? formatMonth(selectedMonth + "-01")
    : t(`greeting.subtitle.${tab}` as never);

  return (
    <div className="hidden md:block py-[18px] sticky top-0 z-30 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[21px] font-heading font-semibold text-[#0C0D0E] tracking-[-0.01em] capitalize">
            {title}
          </h1>
          {tab === "month" && openingBalance != null && (
            <p className="text-[13px] text-[#8A919C] mt-[2px]">
              {t("greeting.openingBalanceSubtitle", {
                amount: formatCurrency(openingBalance),
                count: transactionCount ?? 0,
              }).split(formatCurrency(openingBalance)).map((part, i, arr) =>
                i < arr.length - 1 ? (
                  <span key={i}>
                    {part}
                    <span className="font-medium text-[#414750] tabular-nums">{formatCurrency(openingBalance)}</span>
                  </span>
                ) : (
                  <span key={i}>{part}</span>
                )
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 mt-[2px]">
          <EmptyStateBanner />
          <span className={PILL}>
            <SlidersHorizontal className="w-[14px] h-[14px] text-[#8A919C]" strokeWidth={2} />
            {t("greeting.filter")}
          </span>
          {tab === "month" && <MonthPill />}
          {tab === "year" && <YearPill />}
          {tab === "history" && <HistoryControls />}
        </div>
      </div>
    </div>
  );
}
