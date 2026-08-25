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
  Check,
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
import type { MovementType } from "./types";

export type SortColumn = "date" | "description" | "account" | "movement" | "category" | "amount";
export type SortDirection = "asc" | "desc";
export interface DataFilters {
  accounts: string[];
  movements: MovementType[];
  categories: string[];
}

interface DataToolbarProps {
  monthLabel: string;
  monthDate: Date;
  txCount: number;
  openingBalance?: number | null;
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
  isLocked?: boolean;
  monthsWithData?: Set<string>;
  firstMonthWithData?: string | null;
}

const SORT_COLUMNS: SortColumn[] = ["date", "description", "account", "movement", "category", "amount"];

export function DataToolbar({
  monthLabel,
  monthDate,
  txCount,
  openingBalance,
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
  isLocked,
  monthsWithData,
  firstMonthWithData,
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

  const sortLabel = (col: SortColumn) => t(`imports.sort${col.charAt(0).toUpperCase() + col.slice(1)}`);

  return (
    <div className="hidden md:flex items-center justify-between gap-4 bg-card px-6 py-[20px] pb-[16px]">
      {/* Left: Month title + opening balance + nav buttons */}
      <div className="flex items-center gap-[14px]">
        <div className="flex flex-col">
          <h2 className="font-heading font-semibold text-[16px] text-[#0C0D0E] tracking-[-0.01em] capitalize">
            {monthLabel}
          </h2>
          {openingBalance != null && (
            <p className="text-[12.5px] text-[#9AA1AC]">
              {t("imports.openingBalance")}{" "}
              <span className="font-medium text-[#414750] tabular-nums">
                {formatCurrency(openingBalance)}
              </span>
            </p>
          )}
        </div>

        {/* Month navigation — ‹ › calendar in #F5F7F9 container */}
        <div className="flex items-center gap-[2px] bg-[#F5F7F9] rounded-[9px] p-[3px] ml-[6px]">
          <button
            type="button"
            onClick={onPrev}
            className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[7px] text-[#414750] hover:bg-white/60 transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-[15px] h-[15px]" />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={!canGoNext}
            className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[7px] text-[#414750] hover:bg-white/60 transition-colors disabled:opacity-30 disabled:pointer-events-none"
            aria-label="Next month"
          >
            <ChevronRight className="w-[15px] h-[15px]" />
          </button>

          <Popover open={calendarOpen} onOpenChange={(open) => { setCalendarOpen(open); if (open) setViewYear(selectedYear); }}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center w-[28px] h-[28px] rounded-[7px] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.07)] text-[#414750] hover:bg-white/90 transition-colors"
                aria-label="Jump to month"
              >
                <CalendarDays className="w-[15px] h-[15px]" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[252px] p-[12px] rounded-[12px] shadow-[0_10px_34px_-8px_rgba(16,24,40,0.20),0_2px_6px_rgba(16,24,40,0.06)] border-0"
              align="start"
            >
              {/* Year navigator */}
              <div className="flex items-center justify-between mb-[8px]">
                <button
                  type="button"
                  onClick={() => setViewYear((y) => y - 1)}
                  disabled={firstMonthWithData ? viewYear <= parseInt(firstMonthWithData.slice(0, 4)) : false}
                  className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px] hover:bg-[#F5F7F9] transition-colors disabled:text-[#C2C7CE] disabled:pointer-events-none"
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
                  className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-[7px] hover:bg-[#F5F7F9] transition-colors disabled:text-[#C2C7CE] disabled:pointer-events-none"
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
                        "h-[32px] rounded-[9px] text-[13px] transition-colors",
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
                className="flex items-center justify-between w-full h-[32px] rounded-[8px] px-[8px] text-[13.5px] text-[#0C0D0E] hover:bg-[#F5F7F9] transition-colors"
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
                  className="flex items-center justify-between w-full h-[32px] rounded-[8px] px-[8px] text-[13.5px] text-[#0C0D0E] hover:bg-[#F5F7F9] transition-colors"
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

      {/* Right: Sort · Filter · Export · New */}
      <div className="flex items-center gap-[6px] ml-auto">
        {/* Sort */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-[6px] bg-[#F5F7F9] rounded-[9px] px-[11px] py-[7px] text-[13px] font-medium text-[#414750] hover:bg-[#EBEEF2] transition-colors"
            >
              <ArrowUpDown className="w-[14px] h-[14px] text-[#8A919C]" strokeWidth={1.9} />
              {t("imports.sort")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-52 p-1.5" align="end">
            <div className="space-y-0.5">
              {SORT_COLUMNS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => {
                    if (sortColumn === col) {
                      onSortChange(col, sortDirection === "asc" ? "desc" : "asc");
                    } else {
                      onSortChange(col, col === "amount" ? "desc" : "asc");
                    }
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-sm transition-colors",
                    sortColumn === col
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted",
                  )}
                >
                  <span>{sortLabel(col)}</span>
                  {sortColumn === col && (
                    <span className="text-xs text-primary/70">
                      {sortDirection === "asc" ? "A→Z" : "Z→A"}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-[6px] bg-[#F5F7F9] rounded-[9px] px-[11px] py-[7px] text-[13px] font-medium text-[#414750] hover:bg-[#EBEEF2] transition-colors",
                hasActiveFilters && "ring-1 ring-primary/30",
              )}
            >
              <Filter className="w-[14px] h-[14px] text-[#8A919C]" strokeWidth={1.9} />
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
          className="inline-flex items-center gap-[6px] bg-[#F5F7F9] rounded-[9px] px-[11px] py-[7px] text-[13px] font-medium text-[#414750] hover:bg-[#EBEEF2] transition-colors"
        >
          <Download className="w-[14px] h-[14px] text-[#8A919C]" strokeWidth={1.9} />
          {t("export")}
        </button>

        {/* New — primary */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={isLocked}
              className="inline-flex items-center gap-[6px] bg-primary rounded-[9px] px-[14px] py-[8px] text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(27,118,255,0.3)] hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              <Plus className="w-[14px] h-[14px]" />
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
