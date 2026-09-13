import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { usePeriodSelection } from "@/hooks/usePeriodSelection";
import { useLocalization } from "@/hooks/useLocalization";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/hooks/useAuth";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { supabase } from "@/integrations/supabase/client";
import { formatPeriodLabel, periodRangeOf } from "@/lib/analytics";
import { cn } from "@/lib/utils";

type PeriodKey = "month" | "week" | "year";

export function BalanceBand() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation("dashboard");
  const { formatMonth, formatCurrency } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths, openingBalance, transactionCount } =
    useMonthSelection();
  const { selectedPeriod, setSelectedPeriod, availablePeriods } = usePeriodSelection();
  const { getCashAccounts } = useAccounts();
  const { user } = useAuth();
  const { preferences } = useUserPreferences();
  const { convertAmount } = useExchangeRates("EUR");

  const tab = (searchParams.get("tab") ?? "month") as PeriodKey | "history";

  const cashAccounts = getCashAccounts();
  const accountCount = cashAccounts.length;

  const userCurrency = preferences?.base_currency || "EUR";

  const periodRange = useMemo(() => {
    if (tab === "month" && selectedMonth) return periodRangeOf(selectedMonth, "month");
    if (tab === "week" && selectedPeriod.week) return periodRangeOf(selectedPeriod.week, "week");
    if (tab === "year" && selectedPeriod.year) return periodRangeOf(selectedPeriod.year, "year");
    return null;
  }, [tab, selectedMonth, selectedPeriod.week, selectedPeriod.year]);

  const { data: totalBalance } = useQuery({
    queryKey: ["band-total-balance", user?.id, periodRange?.start, periodRange?.end],
    queryFn: async () => {
      if (!user?.id || !periodRange) return null;
      const { data, error } = await supabase.rpc("get_account_period_summary", {
        p_user_id: user.id,
        p_start: periodRange.start,
        p_end: periodRange.end,
      });
      if (error) throw error;
      const sum = (data ?? []).reduce(
        (acc: number, r: { latest_balance: number }) => acc + convertAmount(Number(r.latest_balance), "EUR", userCurrency),
        0,
      );
      return sum;
    },
    enabled: !!user?.id && !!periodRange,
  });

  const handlePeriodChange = (period: PeriodKey) => {
    const next = new URLSearchParams(searchParams);
    if (period === "month") next.delete("tab");
    else next.set("tab", period);
    setSearchParams(next, { replace: true });
  };

  // Month navigation
  const monthIdx = selectedMonth ? availableMonths.indexOf(selectedMonth) : -1;
  const hasOlderMonth = monthIdx < availableMonths.length - 1;
  const hasNewerMonth = monthIdx > 0;
  const monthLabel = selectedMonth ? formatMonth(selectedMonth + "-01") : "–";

  // Week navigation
  const weeks = availablePeriods.week;
  const selectedWeek = selectedPeriod.week;
  const weekIdx = selectedWeek ? weeks.indexOf(selectedWeek) : -1;
  const hasOlderWeek = weekIdx > 0;
  const hasNewerWeek = weekIdx >= 0 && weekIdx < weeks.length - 1;
  const weekLabel = selectedWeek
    ? formatPeriodLabel(selectedWeek, "week", i18n.language)
    : "–";

  // Year navigation
  const years = availablePeriods.year;
  const selectedYear = selectedPeriod.year;
  const yearIdx = selectedYear ? years.indexOf(selectedYear) : -1;
  const hasOlderYear = yearIdx > 0;
  const hasNewerYear = yearIdx >= 0 && yearIdx < years.length - 1;
  const yearLabel = selectedYear ?? "–";

  // Period nav for current tab
  const periodNav = (() => {
    if (tab === "month")
      return {
        label: monthLabel,
        hasPrev: hasOlderMonth,
        hasNext: hasNewerMonth,
        onPrev: () => hasOlderMonth && setSelectedMonth(availableMonths[monthIdx + 1]),
        onNext: () => hasNewerMonth && setSelectedMonth(availableMonths[monthIdx - 1]),
      };
    if (tab === "week")
      return {
        label: weekLabel,
        hasPrev: hasOlderWeek,
        hasNext: hasNewerWeek,
        onPrev: () => hasOlderWeek && setSelectedPeriod("week", weeks[weekIdx - 1]),
        onNext: () => hasNewerWeek && setSelectedPeriod("week", weeks[weekIdx + 1]),
      };
    if (tab === "year")
      return {
        label: yearLabel,
        hasPrev: hasOlderYear,
        hasNext: hasNewerYear,
        onPrev: () => hasOlderYear && setSelectedPeriod("year", years[yearIdx - 1]),
        onNext: () => hasNewerYear && setSelectedPeriod("year", years[yearIdx + 1]),
      };
    return null;
  })();

  return (
    <div className="hidden md:block bg-primary px-[34px] pt-[24px] pb-[78px]">
      <div className="flex items-start gap-[24px]">
        {/* Left — balance info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-[10px] h-[27px]">
            <span className="font-sans text-[13px] font-medium text-white/80 whitespace-nowrap">
              {t("band.totalBalance", { defaultValue: "Total balance" })}
              {accountCount > 0 && ` · ${accountCount} ${t("band.accounts", { defaultValue: "accounts", count: accountCount })}`}
            </span>
            <Eye className="w-[14px] h-[14px] text-white/70 cursor-pointer" strokeWidth={1.9} />
          </div>
          <p className="mt-[5px] font-heading font-semibold text-[26px] text-white leading-none tabular-nums whitespace-nowrap">
            {totalBalance != null ? formatCurrency(totalBalance) : "–"}
          </p>
          <p className="mt-[10px] font-sans text-[13.5px] text-white/80">
            {t("band.openingBalance", { defaultValue: "Opening balance" })}{" "}
            <span className="font-semibold text-white tabular-nums">
              {openingBalance != null ? formatCurrency(openingBalance) : "–"}
            </span>
            {" · "}
            {transactionCount ?? 0} {t("band.movements", { defaultValue: "movements" })}
          </p>
        </div>

        {/* Right — selectors */}
        <div className="flex items-center gap-[8px] shrink-0">
          {/* Period segmented control */}
          {tab !== "history" && (
            <div className="flex bg-white/[0.16] rounded-[12px] p-[4px] gap-[2px]">
              {(["month", "week", "year"] as PeriodKey[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  className={cn(
                    "px-[13px] h-[28px] flex items-center rounded-[9px] font-heading text-[13px] transition-colors",
                    tab === p
                      ? "bg-white text-primary font-semibold"
                      : "text-white/85 font-medium hover:bg-white/10",
                  )}
                >
                  {t(`band.period.${p}`, { defaultValue: p })}
                </button>
              ))}
            </div>
          )}

          {/* Filter chip */}
          <button
            type="button"
            className="flex items-center gap-[7px] bg-white/[0.16] rounded-[12px] px-[13px] h-[36px] hover:bg-white/[0.22] transition-colors"
          >
            <SlidersHorizontal className="w-[14px] h-[14px] text-white" strokeWidth={2} />
            <span className="font-sans text-[13px] font-medium text-white">
              {t("greeting.filter", { defaultValue: "Filters" })}
            </span>
          </button>

          {/* Period navigator */}
          {periodNav && (
            <div className="flex items-center gap-[2px] bg-white/[0.16] rounded-[12px] p-[4px]">
              <button
                type="button"
                onClick={periodNav.onPrev}
                disabled={!periodNav.hasPrev}
                className="w-[28px] h-[28px] rounded-[9px] flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-[14px] h-[14px] text-white" strokeWidth={2.2} />
              </button>
              <span className="min-w-[88px] text-center font-heading text-[13px] font-semibold text-white capitalize">
                {periodNav.label}
              </span>
              <button
                type="button"
                onClick={periodNav.onNext}
                disabled={!periodNav.hasNext}
                className="w-[28px] h-[28px] rounded-[9px] flex items-center justify-center disabled:opacity-[0.45]"
              >
                <ChevronRight className="w-[14px] h-[14px] text-white" strokeWidth={2.2} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
