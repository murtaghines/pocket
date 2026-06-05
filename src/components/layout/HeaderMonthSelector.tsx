import { ChevronDown } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useMonthSelection } from "@/hooks/useMonthSelection";
import { useLocalization } from "@/hooks/useLocalization";

export function HeaderMonthSelector() {
  const location = useLocation();
  const { t } = useTranslation("dashboard");
  const { formatMonth, formatCurrency } = useLocalization();
  const { selectedMonth, setSelectedMonth, availableMonths, openingBalance } = useMonthSelection();

  if (location.pathname !== "/dashboard") return null;
  if (availableMonths.length === 0) return null;

  return (
    <div className="flex flex-col min-w-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto px-2 -ml-2 py-1 hover:bg-muted/60 rounded-lg justify-start"
          >
            <h1 className="text-lg md:text-xl font-semibold tracking-tight capitalize text-foreground leading-tight truncate">
              {selectedMonth ? formatMonth(selectedMonth + "-01") : ""}
            </h1>
            <ChevronDown className="w-4 h-4 ml-1.5 text-muted-foreground shrink-0" strokeWidth={2.25} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
          {availableMonths.map((m) => (
            <DropdownMenuItem
              key={m}
              onSelect={() => setSelectedMonth(m)}
              className={
                m === selectedMonth ? "capitalize font-medium bg-muted/60" : "capitalize"
              }
            >
              {formatMonth(m + "-01")}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {openingBalance != null && (
        <p className="text-xs text-muted-foreground pl-2 -mt-0.5 truncate">
          {t("stats.openingBalance", { defaultValue: "Opening balance" })}: {formatCurrency(openingBalance)}
        </p>
      )}
    </div>
  );
}
