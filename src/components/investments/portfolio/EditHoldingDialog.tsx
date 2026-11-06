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
import type { Holding } from "@/hooks/useHoldings";
import { useHoldings } from "@/hooks/useHoldings";
import { useAccounts } from "@/hooks/useAccounts";
import { getAccountDisplayName } from "@/lib/accountColors";
import { ASSET_CLASS_KEYS, ASSET_CLASS_CONFIG } from "./assetClassConfig";

interface EditHoldingDialogProps {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditHoldingDialog({ holding, open, onOpenChange }: EditHoldingDialogProps) {
  const { t } = useTranslation("investments");
  const { updateHolding } = useHoldings();
  const { getInvestmentAccounts } = useAccounts();
  const investmentAccounts = getInvestmentAccounts();

  const [assetName, setAssetName] = useState(holding.asset_name);
  const [ticker, setTicker] = useState(holding.ticker ?? "");
  const [assetClass, setAssetClass] = useState(holding.asset_class);
  const [accountId, setAccountId] = useState(holding.account_id ?? "none");
  const [quantity, setQuantity] = useState(String(holding.quantity));
  const [avgCost, setAvgCost] = useState(String(holding.avg_cost_per_unit));
  const [currency, setCurrency] = useState(holding.currency);
  const [notes, setNotes] = useState(holding.notes ?? "");

  const inputClass =
    "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!assetName || !quantity || !avgCost) {
      toast.error(t("portfolio.fillRequired"));
      return;
    }

    try {
      await updateHolding.mutateAsync({
        id: holding.id,
        asset_name: assetName.trim(),
        ticker: ticker.trim() || null,
        asset_class: assetClass,
        account_id: accountId !== "none" ? accountId : null,
        quantity: parseFloat(quantity),
        avg_cost_per_unit: parseFloat(avgCost),
        currency,
        notes: notes.trim() || null,
      });
      toast.success(t("portfolio.holdingUpdated"));
      onOpenChange(false);
    } catch {
      toast.error(t("portfolio.errorUpdating"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("portfolio.editHolding")}</DialogTitle>
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
                    <Select value={accountId} onValueChange={setAccountId}>
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
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="ARS">ARS</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="BRL">BRL</SelectItem>
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
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("portfolio.notesLabel")}
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("portfolio.notesPlaceholder")}
                    className={inputClass}
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
              disabled={updateHolding.isPending}
              className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
            >
              {t("portfolio.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
