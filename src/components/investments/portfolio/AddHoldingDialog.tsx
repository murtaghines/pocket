import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useHoldings } from "@/hooks/useHoldings";
import { useAccounts } from "@/hooks/useAccounts";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { getAccountDisplayName } from "@/lib/accountColors";
import { ASSET_CLASS_KEYS, ASSET_CLASS_CONFIG } from "./assetClassConfig";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";

interface AddHoldingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddHoldingDialog({ open, onOpenChange }: AddHoldingDialogProps) {
  const { t } = useTranslation("investments");
  const { addHolding } = useHoldings();
  const { getInvestmentAccounts } = useAccounts();
  const { preferences } = useUserPreferences();
  const investmentAccounts = getInvestmentAccounts();
  const baseCurrency = preferences?.base_currency || "EUR";

  const [assetName, setAssetName] = useState("");
  const [accountId, setAccountId] = useState<string>("none");
  const [ticker, setTicker] = useState("");
  const [assetClass, setAssetClass] = useState("stocks");
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);

  const handleAccountChange = (id: string) => {
    setAccountId(id);
    if (id !== "none") {
      const acct = investmentAccounts.find((a) => a.id === id);
      if (acct) setCurrency(acct.currency_base);
    }
  };

  const inputClass =
    "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

  const reset = () => {
    setAssetName("");
    setAccountId("none");
    setTicker("");
    setAssetClass("stocks");
    setQuantity("");
    setAvgCost("");
    setCurrentPrice("");
    setCurrency(baseCurrency);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetName || !quantity || !avgCost) {
      toast.error(t("portfolio.fillRequired"));
      return;
    }

    try {
      await addHolding.mutateAsync({
        account_id: accountId !== "none" ? accountId : null,
        asset_name: assetName.trim(),
        ticker: ticker.trim() || null,
        asset_class: assetClass,
        quantity: parseFloat(quantity),
        avg_cost_per_unit: parseFloat(avgCost),
        current_price: currentPrice ? parseFloat(currentPrice) : null,
        currency,
      });
      toast.success(t("portfolio.holdingAdded"));
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("portfolio.errorAdding"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("portfolio.addHolding")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.assetNameLabel")} *
                  </Label>
                  <Input
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    placeholder={t("portfolio.assetNamePlaceholder")}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.tickerLabel")}
                  </Label>
                  <Input
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    placeholder="AAPL, BTC, VWCE.DE"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.assetClassLabel")}
                  </Label>
                  <Select value={assetClass} onValueChange={setAssetClass}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_CLASS_KEYS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`byAssetType.types.${ASSET_CLASS_CONFIG[k].i18nKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {investmentAccounts.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] font-medium text-muted-foreground">
                      {t("portfolio.accountLabel")}
                    </Label>
                    <Select value={accountId} onValueChange={handleAccountChange}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder={t("portfolio.noAccount")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t("portfolio.noAccount")}</SelectItem>
                        {investmentAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {getAccountDisplayName(a)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.currencyLabel")}
                  </Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} {c.symbol}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.quantityLabel")} *
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="10"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.avgCostLabel")} *
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={avgCost}
                    onChange={(e) => setAvgCost(e.target.value)}
                    placeholder="150.00"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.currentPriceLabel")}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    placeholder="185.00"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-12 rounded-[14px] px-6"
            >
              {t("portfolio.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={addHolding.isPending}
              className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
            >
              {addHolding.isPending ? t("portfolio.adding") : t("portfolio.add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
