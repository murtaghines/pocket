import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
}

const SORT_COLUMNS: SortColumn[] = ["date", "description", "account", "movement", "category", "amount"];

export function DataToolbar({
  monthLabel,
  monthDate,
  txCount,
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
}: DataToolbarProps) {
  const { t } = useTranslation("common");
  const [calendarOpen, setCalendarOpen] = useState(false);

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
    <div className="hidden md:flex items-center justify-between gap-4 px-6 py-3 border-b border-border bg-card">
      {/* Left: Month navigation */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {monthLabel}
        </h2>
        {txCount > 0 && (
          <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full text-xs font-semibold tabular-nums bg-primary/15 text-primary">
            {txCount} {t("imports.transactions")}
          </span>
        )}
        <div className="flex items-center gap-0.5 ml-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onPrev}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Jump to month"
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={monthDate}
              onSelect={(d) => {
                if (d) {
                  onMonthJump(d);
                  setCalendarOpen(false);
                }
              }}
              defaultMonth={monthDate}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Order By */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {t("imports.orderBy")}
            </Button>
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

        {/* Filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 text-sm font-medium",
                hasActiveFilters
                  ? "text-primary hover:text-primary"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              {t("imports.filters")}
              {hasActiveFilters && (
                <span className="ml-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {filters.accounts.length + filters.movements.length + filters.categories.length}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="end">
            <div className="space-y-4">
              {/* Account filter */}
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

              {/* Movement filter */}
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

              {/* Category filter */}
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
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground"
                  onClick={() => onFiltersChange({ accounts: [], movements: [], categories: [] })}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm font-medium"
          onClick={onExport}
        >
          <Download className="w-3.5 h-3.5" />
          {t("export")}
        </Button>

        {/* Add new transaction */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" className="h-8 gap-1.5 text-sm font-medium" disabled={isLocked}>
              <Plus className="w-3.5 h-3.5" />
              {t("imports.addNewTransaction")}
            </Button>
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
