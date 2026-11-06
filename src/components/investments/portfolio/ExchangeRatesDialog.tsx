import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePortfolioRates, type RateType, type RateOverride } from "@/hooks/usePortfolioRates";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import { useLocalization } from "@/hooks/useLocalization";

interface ExchangeRatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RATE_TYPES: { value: RateType; labelKey: string }[] = [
  { value: "official", labelKey: "multicurrency.rateOfficial" },
  { value: "mep", labelKey: "multicurrency.rateMep" },
  { value: "blue", labelKey: "multicurrency.rateBlue" },
  { value: "custom", labelKey: "multicurrency.rateCustom" },
];

const inputClass =
  "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

export function ExchangeRatesDialog({ open, onOpenChange }: ExchangeRatesDialogProps) {
  const { t } = useTranslation("investments");
  const { baseCurrency } = useLocalization();
  const { overrides, upsertRate, deleteRate } = usePortfolioRates();

  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState(baseCurrency === "USD" ? "ARS" : "USD");
  const [rate, setRate] = useState("");
  const [rateType, setRateType] = useState<RateType>("official");

  const handleAdd = async () => {
    const numRate = parseFloat(rate);
    if (!numRate || numRate <= 0 || fromCurrency === toCurrency) {
      toast.error(t("multicurrency.invalidRate"));
      return;
    }
    try {
      await upsertRate.mutateAsync({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        rate: numRate,
        rate_type: rateType,
      });
      toast.success(t("multicurrency.rateSaved"));
      setRate("");
    } catch {
      toast.error(t("multicurrency.errorSaving"));
    }
  };

  const handleDelete = async (override: RateOverride) => {
    try {
      await deleteRate.mutateAsync(override.id);
      toast.success(t("multicurrency.rateDeleted"));
    } catch {
      toast.error(t("multicurrency.errorDeleting"));
    }
  };

  const currencyCodes = SUPPORTED_CURRENCIES.map((c) => c.code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("multicurrency.manageRates")}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-muted-foreground mb-4">
            {t("multicurrency.manageRatesDescription")}
          </p>

          {/* Add rate form */}
          <div className="flex flex-col gap-3 mb-5 p-4 bg-muted/50 rounded-xl">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("multicurrency.from")}
                </Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyCodes.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground mb-3" />
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("multicurrency.to")}
                </Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyCodes.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("multicurrency.rate")}
                </Label>
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="1.08"
                  className={`${inputClass} tabular-nums`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  {t("multicurrency.rateType")}
                </Label>
                <Select value={rateType} onValueChange={(v) => setRateType(v as RateType)}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RATE_TYPES.map((rt) => (
                      <SelectItem key={rt.value} value={rt.value}>
                        {t(rt.labelKey)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={upsertRate.isPending || !rate}
              className="self-end gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("multicurrency.addRate")}
            </Button>
          </div>

          {/* Existing overrides */}
          {overrides.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t("multicurrency.noOverrides")}
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {overrides.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-card text-sm"
                >
                  <span className="font-medium tabular-nums">
                    1 {o.from_currency}
                  </span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="font-medium tabular-nums">
                    {o.rate} {o.to_currency}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 ml-1">
                    {t(`multicurrency.rate${o.rate_type.charAt(0).toUpperCase() + o.rate_type.slice(1)}`)}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    {new Date(o.updated_at).toLocaleDateString()}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 text-destructive hover:text-destructive shrink-0"
                    onClick={() => handleDelete(o)}
                    disabled={deleteRate.isPending}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
