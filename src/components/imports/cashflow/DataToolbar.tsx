import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Plus,
  Minus,
  ArrowRightLeft,
  Upload,
  CalendarDays,
  X,
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
  onExport,
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
      {/* ─── Row 1: Gray title strip ─── */}
      <div className="flex items-start justify-between px-6 pt-4 pb-3 bg-[#F5F7F9] border-b border-border/60">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground capitalize leading-tight select-none">
            {monthLabel}
          </h2>
          <div className="flex items-center gap-[6px] mt-[4px] text-[11.5px] text-muted-foreground tabular-nums">
            {displayCount > 0 && (
              <span>
                {displayCount} {displayCount === 1 ? t("imports.txSingular", "tx") : t("imports.txPlural", "txs")}
              </span>
            )}
            {globalSummary && globalSummary.income > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-success font-medium">+{formatCurrency(globalSummary.income)}</span>
              </>
            )}
            {globalSummary && globalSummary.expenses > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-destructive font-medium">−{formatCurrency(globalSummary.expenses)}</span>
              </>
            )}
            {globalSummary && globalSummary.transfersNet != null && globalSummary.transfersNet !== 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-muted-foreground font-medium">
                  {globalSummary.transfersNet >= 0 ? "+" : "−"}{formatCurrency(Math.abs(globalSummary.transfersNet))}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Month navigation — ‹ › 📅 */}
        <div className="flex items-center gap-[2px] shrink-0">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[4px] text-muted-foreground hover:bg-black/[0.06] transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-[15px] h-[15px]" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[4px] text-muted-foreground hover:bg-black/[0.06] transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next month"
          >
            <ChevronRight className="w-[15px] h-[15px]" />
          </button>

          <Popover open={calendarOpen} onOpenChange={(open) => { setCalendarOpen(open); if (open) setViewYear(selectedYear); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[4px] text-muted-foreground hover:bg-black/[0.06] transition-colors"
                aria-label="Jump to month"
              >
                <CalendarDays className="w-[15px] h-[15px]" />
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
      </div>

      {/* ─── Row 2: Action buttons (white) — active chips + Filter, Export, + New ─── */}
      <div className="flex items-center bg-card border-b border-border/60 px-5 py-[5px] gap-1">
        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-none mr-2">
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
        {!hasActiveFilters && <div className="flex-1" />}

        {/* Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-[6px] text-[12.5px] font-medium rounded transition-colors",
                hasActiveFilters
                  ? "text-primary bg-primary/[0.06]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
              )}
            >
              <Filter className="w-[13px] h-[13px]" strokeWidth={1.8} />
              {t("filter")}
              {hasActiveFilters && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
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

        {/* Export */}
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 px-2.5 py-[6px] text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
        >
          <Download className="w-[13px] h-[13px]" strokeWidth={1.8} />
          {t("export")}
        </button>

        {/* Divider */}
        <div className="w-px h-[18px] bg-border/60 mx-1" />

        {/* New transaction — primary */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-[5px] bg-primary rounded-[4px] px-[10px] py-[5px] text-[12px] font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-[13px] h-[13px]" />
              {t("imports.newTransaction", { defaultValue: "New transaction" })}
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

      {/* ─── Row 3: Account tabs (white) ─── */}
      {showAccountTabs && (
        <div className="relative flex items-center gap-0 bg-card border-b border-border/60 pl-5 pr-5 overflow-x-auto scrollbar-none">
          {accountTabs!.map((tab) => {
            const isActive = activeAccountId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onAccountSelect?.(tab.id)}
                className={cn(
                  "relative shrink-0 inline-flex items-center gap-1 px-3 py-[9px] text-[12.5px] transition-colors",
                  isActive
                    ? "text-primary font-semibold bg-primary/[0.06]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-medium",
                )}
              >
                <span className="truncate max-w-[150px]">{tab.name}</span>
                {tab.txCount > 0 && (
                  <span className="text-[10px] text-muted-foreground/60 tabular-nums">{tab.txCount}</span>
                )}
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-primary rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
