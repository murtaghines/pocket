import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeftRight, Layers } from "lucide-react";
import { useUserPreferences, type CostMethod } from "@/hooks/useUserPreferences";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExportButton } from "./ExportButton";
import { ExchangeRatesDialog } from "./ExchangeRatesDialog";
import type { Holding } from "@/hooks/useHoldings";

interface PortfolioHeaderProps {
  isMultiCurrency: boolean;
  holdings: Holding[];
}

export function PortfolioHeader({
  isMultiCurrency,
  holdings,
}: PortfolioHeaderProps) {
  const { t } = useTranslation("investments");
  const { preferences, updatePreferences } = useUserPreferences();
  const [ratesOpen, setRatesOpen] = useState(false);

  const costMethod: CostMethod = preferences.cost_method ?? "fifo";

  return (
    <>
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5">
          <Layers className="w-3.5 h-3.5 text-muted-foreground" />
          <Select
            value={costMethod}
            onValueChange={(v) => updatePreferences({ cost_method: v as CostMethod })}
          >
            <SelectTrigger className="h-6 w-auto min-w-[70px] text-[12px] font-medium bg-transparent border-0 shadow-none focus:ring-0 gap-1 px-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fifo">{t("taxLots.fifo")}</SelectItem>
              <SelectItem value="lifo">{t("taxLots.lifo")}</SelectItem>
              <SelectItem value="average">{t("taxLots.average")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isMultiCurrency && (
          <button
            type="button"
            onClick={() => setRatesOpen(true)}
            className="flex items-center gap-1.5 border border-border rounded-full px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            {t("multicurrency.manageRates")}
          </button>
        )}

        <ExportButton holdings={holdings} />
      </div>

      {ratesOpen && (
        <ExchangeRatesDialog open={ratesOpen} onOpenChange={setRatesOpen} />
      )}
    </>
  );
}
