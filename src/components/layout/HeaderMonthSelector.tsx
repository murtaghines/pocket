import { ChevronDown, Calendar } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { useLocalization } from "@/hooks/useLocalization";
import { cn } from "@/lib/utils";

interface HeaderMonthSelectorProps {
  /** Render mode: 'header' (top bar, dark text), 'rail' (left nav, light text on primary bg) */
  variant?: "header" | "rail";
  expanded?: boolean;
}

export function HeaderMonthSelector({ variant = "header", expanded = true }: HeaderMonthSelectorProps) {
  const location = useLocation();
  const { t } = useTranslation("dashboard");
  const { formatMonth, formatCurrency } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths, openingBalance } = useMonthSelection();

  if (location.pathname !== "/dashboard") return null;

  const hasMonths = availableMonths.length > 0;
  const label = selectedMonth && hasMonths
    ? formatMonth(selectedMonth + "-01")
    : t("period.noPeriods", "No data yet");

  if (variant === "rail") {
    // Collapsed rail: icon-only button with tooltip
    if (!expanded) {
      return (
        <div className="px-3 mt-2">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={label}
                    disabled={!hasMonths}
                    className={cn(
                      "mx-auto flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                      "text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10",
                      !hasMonths && "opacity-50 cursor-not-allowed",
                    )}
                  >
                    <Calendar className="h-5 w-5" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {label}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" side="right" className="max-h-80 overflow-y-auto">
              {availableMonths.map((m) => (
                <DropdownMenuItem
                  key={m}
                  onSelect={() => setSelectedMonth(m)}
                  className={m === selectedMonth ? "capitalize font-medium bg-muted/60" : "capitalize"}
                >
                  {formatMonth(m + "-01")}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    }

    // Expanded rail
    return (
      <div className="px-3 mt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={!hasMonths}
              className={cn(
                "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
                "text-primary-foreground/85 hover:text-primary-foreground hover:bg-primary-foreground/10",
                !hasMonths && "opacity-50 cursor-not-allowed",
              )}
            >
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm font-semibold capitalize">
                {label}
              </span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" strokeWidth={2.25} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" className="max-h-80 overflow-y-auto">
            {availableMonths.map((m) => (
              <DropdownMenuItem
                key={m}
                onSelect={() => setSelectedMonth(m)}
                className={m === selectedMonth ? "capitalize font-medium bg-muted/60" : "capitalize"}
              >
                {formatMonth(m + "-01")}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {openingBalance != null && (
          <p className="text-[11px] text-primary-foreground/70 pl-8 mt-0.5 truncate">
            {t("stats.openingBalance", { defaultValue: "Opening balance" })}: {formatCurrency(openingBalance)}
          </p>
        )}
      </div>
    );
  }

  // Default 'header' variant — title + opening balance subtitle on the left of the top bar
  if (!hasMonths) return null;
  return (
    <div className="flex flex-col min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-auto px-2 -ml-2 py-1 hover:bg-muted/60 rounded-lg"
          >
            <h1 className="text-lg md:text-xl font-semibold tracking-tight capitalize text-foreground leading-tight truncate">
              {label}
            </h1>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" strokeWidth={2.25} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
          {availableMonths.map((m) => (
            <DropdownMenuItem
              key={m}
              onSelect={() => setSelectedMonth(m)}
              className={m === selectedMonth ? "capitalize font-medium bg-muted/60" : "capitalize"}
            >
              {formatMonth(m + "-01")}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {openingBalance != null && (
        <p className="text-xs text-muted-foreground -mt-0.5 truncate">
          {t("stats.openingBalance", { defaultValue: "Opening balance" })}: {formatCurrency(openingBalance)}
        </p>
      )}
    </div>
  );
}
