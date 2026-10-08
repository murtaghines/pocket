import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Download,
  Plus,
  Minus,
  ArrowRightLeft,
  Upload,
  CalendarDays,
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
import { getAccountDisplayName } from "@/lib/accountColors";
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
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSortChange: (column: SortColumn, direction: SortDirection) => void;
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
  sortColumn,
  sortDirection,
  onSortChange,
  filters,
  onFiltersChange,
  accounts,
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
  tabSummary,
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
    filters.accounts.length > 0 ||
    filters.movements.length > 0 ||
    filters.categories.length > 0;

  const toggleAccountFilter = (id: string) => {
    const next = filters.accounts.includes(id)
      ? filters.accounts.filter((a) => a !== id)
      : [...filters.accounts, id];
    onFiltersChange({ ...filters, accounts: next });
  };

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
  const displayCount = tabSummary ? tabSummary.total - tabSummary.hidden : txCount;

  return (
    <div className="hidden md:flex flex-col bg-[#F5F7F9]">
      {/* ─── Row 1: Title + Subtitle  |  Month navigation ─── */}
      <div className="flex items-start justify-between px-6 pt-3 pb-2">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-foreground capitalize leading-tight select-none">
            {monthLabel}
          </h2>
          <div className="flex items-center gap-[6px] mt-[3px] text-[11.5px] text-muted-foreground tabular-nums">
            {displayCount > 0 && (
              <span>
                {displayCount} {displayCount === 1 ? t("imports.txSingular", "tx") : t("imports.txPlural", "txs")}
              </span>
            )}
            {tabSummary && tabSummary.income > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-success font-medium">+{formatCurrency(tabSummary.income)}</span>
              </>
            )}
            {tabSummary && tabSummary.expenses > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-destructive font-medium">−{formatCurrency(tabSummary.expenses)}</span>
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

      {/* ─── Row 2: Account tabs (flat text + blue underline) ─── */}
      {showAccountTabs && (
        <div className="relative flex items-end gap-0 px-5 overflow-x-auto scrollbar-none">
          {accountTabs!.map((tab) => {
            const isActive = activeAccountId === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onAccountSelect?.(tab.id)}
                className={cn(
                  "relative shrink-0 inline-flex items-center gap-1.5 px-3 pb-[9px] pt-[7px] text-[13px] transition-colors",
                  isActive
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground font-medium",
                )}
              >
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ backgroundColor: tab.color }}
                />
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
          <div className="absolute bottom-0 left-0 right-0 h-px bg-border/60" />
        </div>
      )}

      {/* ─── Row 3: Action buttons (right-aligned, squared) ─── */}
      <div className="flex items-center justify-end gap-[5px] px-6 py-[7px] border-b border-border/60">
        {/* Sort — date direction toggle */}
        <button
          type="button"
          onClick={() => onSortChange("date", sortDirection === "asc" ? "desc" : "asc")}
          className="inline-flex items-center gap-[5px] bg-white rounded-[4px] px-[10px] py-[5px] text-[12px] font-medium text-[#414750] border border-border/50 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors"
        >
          <ArrowUpDown className="w-[13px] h-[13px] text-primary/50" strokeWidth={1.9} />
          {sortDirection === "desc" ? t("imports.newestFirst", { defaultValue: "Newest first" }) : t("imports.oldestFirst", { defaultValue: "Oldest first" })}
        </button>

        {/* Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-[5px] bg-white rounded-[4px] px-[10px] py-[5px] text-[12px] font-medium text-[#414750] border border-border/50 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors",
                hasActiveFilters && "border-primary/40 bg-primary/[0.06] text-primary",
              )}
            >
              <Filter className={cn("w-[13px] h-[13px]", hasActiveFilters ? "text-primary" : "text-primary/50")} strokeWidth={1.9} />
              {t("filter")}
              {hasActiveFilters && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {filters.accounts.length + filters.movements.length + filters.categories.length}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-4">
              {accounts.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
                    {t("imports.account")}
                  </p>
                  <div className="space-y-1">
                    {accounts.map((acct) => (
                      <label
                        key={acct.id}
                        className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.accounts.includes(acct.id)}
                          onCheckedChange={() => toggleAccountFilter(acct.id)}
                        />
                        <span className="text-sm text-foreground truncate">
                          {getAccountDisplayName(acct as any)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
                  onClick={() => onFiltersChange({ accounts: [], movements: [], categories: [] })}
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
          className="inline-flex items-center gap-[5px] bg-white rounded-[4px] px-[10px] py-[5px] text-[12px] font-medium text-[#414750] border border-border/50 hover:border-primary/30 hover:bg-primary/[0.04] transition-colors"
        >
          <Download className="w-[13px] h-[13px] text-primary/50" strokeWidth={1.9} />
          {t("export")}
        </button>

        {/* New — primary */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-[5px] bg-primary rounded-[4px] px-[12px] py-[5px] text-[12px] font-semibold text-white shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-[13px] h-[13px]" />
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
  );
}
