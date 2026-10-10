import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Minus,
  ArrowRightLeft,
  Upload,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/categoryTranslations";
import type { AccountTab } from "./AccountSheetTabs";
import type { MovementType } from "./types";

export type SortColumn = "date";
export type SortDirection = "asc" | "desc";
export interface DataFilters {
  accounts: string[];
  movements: MovementType[];
  categories: string[];
}

export interface TabSummary {
  income: number;
  expenses: number;
  transfers: number;
  transfersNet: number;
  hidden: number;
  total: number;
}

interface DataToolbarProps {
  monthLabel: string;
  monthDate: Date;
  txCount: number;
  formatCurrency: (amount: number) => string;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
  onMonthJump: (date: Date) => void;
  filters: DataFilters;
  onFiltersChange: (filters: DataFilters) => void;
  accounts: { id: string; name: string; nickname?: string | null; color?: string | null }[];
  availableCategories: string[];
  onAddExpense: () => void;
  onAddIncome: () => void;
  onAddTransfer: () => void;
  onUploadFile: () => void;
  onExport: () => void;
  monthsWithData?: Set<string>;
  firstMonthWithData?: string | null;
  accountTabs?: AccountTab[];
  activeAccountId?: string | null;
  onAccountSelect?: (id: string) => void;
  tabSummary?: TabSummary;
  globalSummary?: TabSummary;
}


export function DataToolbar({
  monthLabel,
  monthDate,
  txCount,
  formatCurrency,
  onPrev,
  onNext,
  canGoNext,
  onMonthJump,
  filters,
  onFiltersChange,
  availableCategories,
  onAddExpense,
  onAddIncome,
  onAddTransfer,
  onUploadFile,
  monthsWithData,
  firstMonthWithData,
  accountTabs,
  activeAccountId,
  onAccountSelect,
  globalSummary,
}: DataToolbarProps) {
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

  const hasActiveFilters =
    filters.movements.length > 0 ||
    filters.categories.length > 0;

  const toggleMovementFilter = (m: MovementType) => {
    const next = filters.movements.includes(m)
      ? filters.movements.filter((x) => x !== m)
      : [...filters.movements, m];
    onFiltersChange({ ...filters, movements: next });
  };

  const toggleCategoryFilter = (slug: string) => {
    const next = filters.categories.includes(slug)
      ? filters.categories.filter((c) => c !== slug)
      : [...filters.categories, slug];
    onFiltersChange({ ...filters, categories: next });
  };

  const showAccountTabs = (accountTabs?.length ?? 0) > 1;
  const displayCount = globalSummary ? globalSummary.total - globalSummary.hidden : txCount;

  return (
    <div className="hidden md:flex flex-col">
      {/* ─── Banner azul ─── */}
      <header
        className="flex items-center bg-primary"
        style={{ padding: "22px 34px", gap: 28 }}
      >
        {/* Left side */}
        <div className="flex-1 min-w-0">
          <h1
            className="font-heading text-white leading-none select-none"
            style={{ fontWeight: 600, fontSize: 19, letterSpacing: "-0.01em", margin: 0 }}
          >
            {monthLabel}
          </h1>
          <div className="flex items-center flex-wrap" style={{ marginTop: 8, gap: 14 }}>
            {displayCount > 0 && (
              <span
                className="tabular-nums"
                style={{ font: "500 12.5px Inter, sans-serif", color: "rgba(255,255,255,0.78)" }}
              >
                {displayCount} {t("imports.transactions")}
              </span>
            )}
            {globalSummary && globalSummary.income > 0 && (
              <>
                <span className="rounded-full" style={{ width: 3, height: 3, background: "rgba(255,255,255,0.5)" }} />
                <span
                  className="tabular-nums"
                  style={{ font: "600 12.5px Inter, sans-serif", color: "#FFFFFF" }}
                >
                  +{formatCurrency(globalSummary.income)}
                </span>
              </>
            )}
            {globalSummary && globalSummary.expenses > 0 && (
              <>
                <span className="rounded-full" style={{ width: 3, height: 3, background: "rgba(255,255,255,0.5)" }} />
                <span
                  className="tabular-nums"
                  style={{ font: "600 12.5px Inter, sans-serif", color: "#FFFFFF" }}
                >
                  −{formatCurrency(globalSummary.expenses)}
                </span>
              </>
            )}
            {globalSummary && globalSummary.transfersNet !== 0 && (
              <>
                <span className="rounded-full" style={{ width: 3, height: 3, background: "rgba(255,255,255,0.5)" }} />
                <span
                  className="tabular-nums inline-flex items-center"
                  style={{ font: "600 12.5px Inter, sans-serif", color: "rgba(255,255,255,0.78)", gap: 4 }}
                >
                  <ArrowRightLeft className="w-[13px] h-[13px]" style={{ opacity: 0.85 }} />
                  {globalSummary.transfersNet >= 0 ? "+" : "−"}
                  {formatCurrency(Math.abs(globalSummary.transfersNet))}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side: ‹ › 📅 */}
        <div className="flex items-center shrink-0" style={{ gap: 4 }}>
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex items-center justify-center cursor-pointer"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.14)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
            aria-label="Previous month"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="inline-flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            style={{
              width: 34, height: 34, borderRadius: 10,
              background: "rgba(255,255,255,0.14)",
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
            aria-label="Next month"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>

          <Popover open={calendarOpen} onOpenChange={(open) => { setCalendarOpen(open); if (open) setViewYear(selectedYear); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center cursor-pointer"
                style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: "rgba(255,255,255,0.14)",
                  marginLeft: 4,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
                aria-label="Jump to month"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#fff"><path d="M19 3h-2V1h-2v2H9V1H7v2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2m0 18H5V10h14zm0-13H5V5h14z" /></svg>
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[252px] p-[12px] rounded-[8px]"
              align="end"
            >
              {/* Year navigator */}
              <div className="flex items-center justify-between mb-[8px]">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  disabled={firstMonthWithData ? viewYear <= parseInt(firstMonthWithData.slice(0, 4)) : false}
                  className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[4px] hover:bg-[#F5F7F9] transition-colors disabled:text-[#C2C7CE] disabled:pointer-events-none"
                >
                  <ChevronLeft className="w-[14px] h-[14px]" />
                </button>
                <span className="text-[14px] font-semibold text-[#0C0D0E] tabular-nums select-none">
                  {viewYear}
                </span>
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y + 1)}
                  disabled={viewYear >= currentYear}
                  className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[4px] hover:bg-[#F5F7F9] transition-colors disabled:text-[#C2C7CE] disabled:pointer-events-none"
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
                          ? "bg-primary text-white font-semibold"
                          : isClickable
                            ? "text-[#0C0D0E] hover:bg-[#F5F7F9]"
                            : "text-[#C2C7CE] cursor-default",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="border-t border-[#F1F2F4] mx-[2px] mt-[10px] mb-[6px]" />

              {/* Shortcuts */}
              <button
                type="button"
                onClick={() => {
                  onMonthJump(new Date(currentYear, currentMonth, 1));
                  setCalendarOpen(false);
                }}
                className="flex items-center justify-between w-full h-[32px] rounded-[4px] px-[8px] text-[13.5px] text-[#0C0D0E] hover:bg-[#F5F7F9] transition-colors"
              >
                <span>{t("imports.goToToday")}</span>
                <span className="text-[12px] text-[#B4BAC3]">
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
                  className="flex items-center justify-between w-full h-[32px] rounded-[4px] px-[8px] text-[13.5px] text-[#0C0D0E] hover:bg-[#F5F7F9] transition-colors"
                >
                  <span>{t("imports.firstMonth")}</span>
                  <span className="text-[12px] text-[#B4BAC3]">
                    {shortMonthLabels[parseInt(firstMonthWithData.slice(5, 7)) - 1]} {firstMonthWithData.slice(0, 4)}
                  </span>
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/* ─── Tabs bar + actions ─── */}
      <div
        className="flex items-center bg-card"
        style={{ borderBottom: "1px solid #EDEFF4", padding: "0 34px", gap: 18, minHeight: 52 }}
      >
        {/* Account tabs (scrollable) */}
        {showAccountTabs && (
          <div className="flex items-stretch flex-1 min-w-0 overflow-x-auto scrollbar-none" style={{ height: 52, gap: 0 }}>
            {accountTabs!.map((tab) => {
              const isActive = activeAccountId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onAccountSelect?.(tab.id)}
                  className="flex items-center shrink-0 cursor-pointer whitespace-nowrap"
                  style={{
                    gap: 8,
                    padding: "0 14px",
                    marginRight: 4,
                    borderBottom: isActive ? "2px solid #1B76FF" : "2px solid transparent",
                    background: "transparent",
                    border: "none",
                    borderBottomWidth: 2,
                    borderBottomStyle: "solid",
                    borderBottomColor: isActive ? "#1B76FF" : "transparent",
                  }}
                >
                  <span
                    style={{
                      font: `${isActive ? 700 : 500} 13px Inter, sans-serif`,
                      color: isActive ? "#1B76FF" : "#4A5160",
                    }}
                  >
                    {tab.name}
                  </span>
                  <span
                    className="tabular-nums"
                    style={{
                      borderRadius: 999,
                      padding: "1px 7px",
                      font: "600 10.5px Inter, sans-serif",
                      background: isActive ? "rgba(27,118,255,0.12)" : "#F1F3F8",
                      color: isActive ? "#1B76FF" : "#9AA1AC",
                    }}
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
          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none mr-2">
              {filters.movements.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMovementFilter(m)}
                  className="inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-medium rounded bg-primary/[0.08] text-primary hover:bg-primary/[0.14] transition-colors shrink-0"
                >
                  {m === "INCOME" ? "Income" : m === "EXPENSE" ? "Expense" : "Transfer"}
                  <X className="w-3 h-3" />
                </button>
              ))}
              {filters.categories.map((slug) => (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleCategoryFilter(slug)}
                  className="inline-flex items-center gap-1 px-2 py-[3px] text-[11px] font-medium rounded bg-primary/[0.08] text-primary hover:bg-primary/[0.14] transition-colors shrink-0"
                >
                  <span className="truncate max-w-[100px]">{getCategoryLabel(slug)}</span>
                  <X className="w-3 h-3" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, accounts: [], movements: [], categories: [] })}
                className="text-[11px] text-muted-foreground hover:text-foreground shrink-0 px-1"
              >
                Clear
              </button>
            </div>
          )}

          {/* Filter button (ghost) */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center cursor-pointer"
                style={{
                  gap: 6, height: 32, padding: "0 11px", borderRadius: 9,
                  font: "600 12.5px Inter, sans-serif",
                  color: hasActiveFilters ? "#1B76FF" : "#4A5160",
                  background: hasActiveFilters ? "rgba(27,118,255,0.06)" : "transparent",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  if (!hasActiveFilters) e.currentTarget.style.background = "#F4F6FB";
                }}
                onMouseLeave={(e) => {
                  if (!hasActiveFilters) e.currentTarget.style.background = "transparent";
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill={hasActiveFilters ? "#1B76FF" : "#4A5160"}>
                  <path d="M4.25 5.61C6.57 8.59 10 13 10 13v5c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-5s3.43-4.41 5.75-7.39A1 1 0 0 0 18.95 4H5.04a1 1 0 0 0-.79 1.61" />
                </svg>
                {t("filter")}
                {hasActiveFilters && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {filters.movements.length + filters.categories.length}
                  </span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    {t("imports.movement")}
                  </p>
                  <div className="space-y-1">
                    {(["INCOME", "EXPENSE", "TRANSFER"] as MovementType[]).map((m) => (
                      <label
                        key={m}
                        className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.movements.includes(m)}
                          onCheckedChange={() => toggleMovementFilter(m)}
                        />
                        <span className="text-sm text-foreground">
                          {m === "INCOME" ? "Income" : m === "EXPENSE" ? "Expense" : "Transfer"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {availableCategories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                      {t("imports.category")}
                    </p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availableCategories.map((slug) => (
                        <label
                          key={slug}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={filters.categories.includes(slug)}
                            onCheckedChange={() => toggleCategoryFilter(slug)}
                          />
                          <span className="text-sm text-foreground truncate">
                            {getCategoryLabel(slug)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {hasActiveFilters && (
                  <button
                    type="button"
                    className="w-full text-center text-xs text-muted-foreground hover:text-foreground py-1"
                    onClick={() => onFiltersChange({ ...filters, accounts: [], movements: [], categories: [] })}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* New transaction (primary) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center cursor-pointer"
                style={{
                  gap: 6, height: 32, padding: "0 13px", borderRadius: 9,
                  background: "#1B76FF",
                  font: "600 12.5px Inter, sans-serif",
                  color: "#fff",
                  border: "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#1668E0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#1B76FF"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z" /></svg>
                {t("imports.new")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onAddExpense} className="gap-2">
                <Minus className="w-4 h-4 text-destructive" />
                {t("imports.addExpense")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddIncome} className="gap-2">
                <Plus className="w-4 h-4 text-success" />
                {t("imports.addIncome")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onAddTransfer} className="gap-2">
                <ArrowRightLeft className="w-4 h-4 text-warning" />
                {t("imports.addTransfer")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onUploadFile} className="gap-2">
                <Upload className="w-4 h-4 text-muted-foreground" />
                {t("imports.uploadFile")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
