import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface InvestmentSummary {
  count: number;
  deposits: number;
  withdrawals: number;
  net: number;
  hidden: number;
}

export interface InvestmentAccountTab {
  id: string;
  name: string;
  color: string | null;
  txCount: number;
}

interface InvestmentDataToolbarProps {
  monthLabel: string;
  monthDate: Date;
  formatCurrency: (amount: number) => string;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
  onMonthJump: (date: Date) => void;
  monthsWithData?: Set<string>;
  firstMonthWithData?: string | null;
  onUploadFile: () => void;
  isProcessing: boolean;
  accountTabs?: InvestmentAccountTab[];
  activeAccountId: string | null;
  onAccountSelect: (id: string | null) => void;
  globalSummary?: InvestmentSummary;
  actionSlot?: React.ReactNode;
}

export function InvestmentDataToolbar({
  monthLabel,
  monthDate,
  formatCurrency,
  onPrev,
  onNext,
  canGoNext,
  onMonthJump,
  monthsWithData,
  firstMonthWithData,
  onUploadFile,
  isProcessing,
  accountTabs,
  activeAccountId,
  onAccountSelect,
  globalSummary,
  actionSlot,
}: InvestmentDataToolbarProps) {
  const { t, i18n } = useTranslation("common");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => monthDate.getFullYear());

  const shortMonthLabels = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(i18n.language, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2026, i, 1)));
  }, [i18n.language]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const selectedYear = monthDate.getFullYear();
  const selectedMonth = monthDate.getMonth();

  const showAccountTabs = (accountTabs?.length ?? 0) > 1;
  const displayCount = globalSummary ? globalSummary.count : 0;

  return (
    <div className="hidden md:flex flex-col">
      {/* ─── Blue banner ─── */}
      <header
        className="flex items-center bg-primary"
        style={{ padding: "22px 34px", gap: 28 }}
      >
        {/* Left side */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[19px] font-semibold text-white leading-none tracking-[-0.01em] select-none">
            {monthLabel}
          </h1>
          <div className="flex items-center flex-wrap" style={{ marginTop: 6, gap: 14 }}>
            {displayCount > 0 && (
              <span
                className="tabular-nums text-white/80"
                style={{ font: "500 12.5px Inter, sans-serif" }}
              >
                {displayCount} {t("imports.movementsCount")}
              </span>
            )}
            {globalSummary && globalSummary.deposits > 0 && (
              <>
                <span className="rounded-full bg-white/50" style={{ width: 3, height: 3 }} />
                <span
                  className="tabular-nums text-white"
                  style={{ font: "600 12.5px Inter, sans-serif" }}
                >
                  +{formatCurrency(globalSummary.deposits)}
                </span>
              </>
            )}
            {globalSummary && globalSummary.withdrawals > 0 && (
              <>
                <span className="rounded-full bg-white/50" style={{ width: 3, height: 3 }} />
                <span
                  className="tabular-nums text-white"
                  style={{ font: "600 12.5px Inter, sans-serif" }}
                >
                  −{formatCurrency(globalSummary.withdrawals)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side: calendar jump + month pill */}
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          <Popover open={calendarOpen} onOpenChange={(open) => { setCalendarOpen(open); if (open) setViewYear(selectedYear); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-white/[0.16] transition-colors hover:bg-white/10"
                aria-label="Jump to month"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M19 3h-2V1h-2v2H9V1H7v2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 18H5V10h14zm0-13H5V5h14z" /></svg>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[252px] p-[12px] rounded-[8px]" align="end">
              {/* Year navigator */}
              <div className="flex items-center justify-between mb-[8px]">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  disabled={firstMonthWithData ? viewYear <= parseInt(firstMonthWithData.slice(0, 4)) : false}
                  className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[4px] hover:bg-muted transition-colors disabled:text-muted-foreground/50 disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-[14px] h-[14px]" />
                </button>
                <span className="text-[14px] font-semibold text-foreground tabular-nums select-none">
                  {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  disabled={viewYear >= currentYear}
                  className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[4px] hover:bg-muted transition-colors disabled:text-muted-foreground/50 disabled:pointer-events-none"
                >
                  <ChevronRight className="w-[14px] h-[14px]" />
                </button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-3 gap-[4px]">
                {shortMonthLabels.map((label, i) => {
                  const monthKey = `${viewYear}-${String(i + 1).padStart(2, "0")}`;
                  const isSelected = viewYear === selectedYear && i === selectedMonth;
                  const isFuture = viewYear > currentYear || (viewYear === currentYear && i > currentMonth);
                  const hasData = monthsWithData?.has(monthKey);
                  const isClickable = !isFuture && (hasData || (viewYear === currentYear && i <= currentMonth));

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!isClickable}
                      onClick={() => {
                        onMonthJump(new Date(viewYear, i, 1));
                        setCalendarOpen(false);
                      }}
                      className={cn(
                        "h-[32px] rounded-[4px] text-[13px] transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : isClickable
                            ? "text-foreground hover:bg-muted"
                            : "text-muted-foreground/50 cursor-default",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-border mx-[2px] mt-[10px] mb-[6px]" />

              {/* Shortcuts */}
              <button
                type="button"
                onClick={() => {
                  onMonthJump(new Date(currentYear, currentMonth, 1));
                  setCalendarOpen(false);
                }}
                className="flex items-center justify-between w-full h-[32px] rounded-[4px] px-[8px] text-[13.5px] text-foreground hover:bg-muted transition-colors"
              >
                <span>{t("imports.goToToday")}</span>
                <span className="text-[12px] text-muted-foreground/60">
                  {shortMonthLabels[currentMonth]} {currentYear}
                </span>
              </button>
              {firstMonthWithData && (
                <button
                  type="button"
                  onClick={() => {
                    const [y, m] = firstMonthWithData.split("-").map(Number);
                    onMonthJump(new Date(y, m - 1, 1));
                    setCalendarOpen(false);
                  }}
                  className="flex items-center justify-between w-full h-[32px] rounded-[4px] px-[8px] text-[13.5px] text-foreground hover:bg-muted transition-colors"
                >
                  <span>{t("imports.firstMonth")}</span>
                  <span className="text-[12px] text-muted-foreground/60">
                    {shortMonthLabels[parseInt(firstMonthWithData.slice(5, 7)) - 1]} {firstMonthWithData.slice(0, 4)}
                  </span>
                </button>
              )}
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-[2px] rounded-[12px] bg-white/[0.16] p-[4px]">
            <button
              type="button"
              onClick={onPrev}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[9px] transition-colors hover:bg-white/10"
              aria-label="Previous month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <span className="min-w-[88px] select-none text-center font-heading text-[13px] font-semibold capitalize text-white">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="flex h-[28px] w-[28px] items-center justify-center rounded-[9px] transition-colors hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Next month"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Tabs bar + actions ─── */}
      <div
        className="flex items-center bg-card border-b border-border"
        style={{ padding: "0 34px", gap: 18, minHeight: 52 }}
      >
        {/* Account tabs */}
        {showAccountTabs && (
          <div className="flex items-stretch flex-1 min-w-0 overflow-x-auto scrollbar-none" style={{ height: 52, gap: 0 }}>
            {accountTabs!.map((tab) => {
              const isActive = activeAccountId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onAccountSelect(isActive ? null : tab.id)}
                  className="flex items-center shrink-0 cursor-pointer whitespace-nowrap"
                  style={{
                    gap: 8,
                    padding: "0 14px",
                    marginRight: 4,
                    background: "transparent",
                    border: "none",
                    borderBottomWidth: 2,
                    borderBottomStyle: "solid",
                    borderBottomColor: isActive ? "hsl(var(--primary))" : "transparent",
                  }}
                >
                  <span
                    className={isActive ? "text-primary" : "text-muted-foreground"}
                    style={{ font: `${isActive ? 700 : 500} 13px Inter, sans-serif` }}
                  >
                    {tab.name}
                  </span>
                  <span
                    className={cn(
                      "tabular-nums rounded-full",
                      isActive ? "bg-primary/[0.12] text-primary" : "bg-muted text-muted-foreground",
                    )}
                    style={{ padding: "1px 7px", font: "600 10.5px Inter, sans-serif" }}
                  >
                    {tab.txCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {!showAccountTabs && <div className="flex-1" />}

        {/* Actions */}
        <div className="flex items-center shrink-0" style={{ gap: 8 }}>
          {actionSlot}
          <button
            type="button"
            onClick={onUploadFile}
            disabled={isProcessing}
            className="flex items-center cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 border-none disabled:opacity-50"
            style={{
              gap: 6, height: 32, padding: "0 13px", borderRadius: 9,
              font: "600 12.5px Inter, sans-serif",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
            {t("imports.addFile")}
          </button>
        </div>
      </div>
    </div>
  );
}
