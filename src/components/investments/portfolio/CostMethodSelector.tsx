import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserPreferences, type CostMethod } from "@/hooks/useUserPreferences";
import { Layers } from "lucide-react";

export function CostMethodSelector() {
  const { t } = useTranslation("investments");
  const { preferences, updatePreferences } = useUserPreferences();

  const value: CostMethod = preferences.cost_method ?? "fifo";

  return (
    <div className="flex items-center gap-1.5">
      <Layers className="w-3.5 h-3.5 text-muted-foreground" />
      <Select
        value={value}
        onValueChange={(v) => updatePreferences({ cost_method: v as CostMethod })}
      >
        <SelectTrigger className="h-7 w-auto min-w-[90px] text-xs gap-1 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="fifo">{t("taxLots.fifo")}</SelectItem>
          <SelectItem value="lifo">{t("taxLots.lifo")}</SelectItem>
          <SelectItem value="average">{t("taxLots.average")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
