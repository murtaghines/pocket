import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
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
import { useHoldings, type Holding } from "@/hooks/useHoldings";
import { useInvestmentTransactions, type InvestmentTxType } from "@/hooks/useInvestmentTransactions";

interface RecordTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedHolding?: Holding | null;
}

const TX_TYPES: InvestmentTxType[] = ["buy", "sell", "dividend", "fee"];

export function RecordTransactionDialog({
  open,
  onOpenChange,
  preselectedHolding,
}: RecordTransactionDialogProps) {
  const { t } = useTranslation("investments");
  const { holdings } = useHoldings();
  const { addTransaction } = useInvestmentTransactions();

  const [type, setType] = useState<InvestmentTxType>("buy");
  const [holdingId, setHoldingId] = useState(preselectedHolding?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState("");
  const [fee, setFee] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  const inputClass =
    "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none";

  const selectedHolding = holdings.find((h) => h.id === holdingId);

  const reset = () => {
    setType("buy");
    setHoldingId(preselectedHolding?.id ?? "");
    setQuantity("");
    setPricePerUnit("");
    setFee("");
    setDate(new Date().toISOString().slice(0, 10));
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!quantity || !pricePerUnit) {
      toast.error(t("transactions.fillRequired"));
      return;
    }

    try {
      await addTransaction.mutateAsync({
        holding_id: holdingId || null,
        account_id: selectedHolding?.account_id ?? null,
        type,
        ticker: selectedHolding?.ticker ?? null,
        asset_name: selectedHolding?.asset_name ?? null,
        quantity: parseFloat(quantity),
        price_per_unit: parseFloat(pricePerUnit),
        fee: fee ? parseFloat(fee) : 0,
        currency: selectedHolding?.currency ?? "USD",
        date: new Date(date).toISOString(),
        notes: notes.trim() || null,
      });
      toast.success(t("transactions.recorded"));
      reset();
      onOpenChange(false);
    } catch {
      toast.error(t("transactions.errorRecording"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("transactions.record")}</DialogTitle>
          <DialogDescription>{t("transactions.recordDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("transactions.type")} *
                  </Label>
                  <Select value={type} onValueChange={(v) => setType(v as InvestmentTxType)}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TX_TYPES.map((k) => (
                        <SelectItem key={k} value={k}>
                          {t(`transactions.${k}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("transactions.holding")}
                  </Label>
                  <Select value={holdingId} onValueChange={setHoldingId}>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder={t("transactions.selectHolding")} />
                    </SelectTrigger>
                    <SelectContent>
                      {holdings.length === 0 ? (
                        <SelectItem value="_none" disabled>
                          {t("transactions.noHoldings")}
                        </SelectItem>
                      ) : (
                        holdings.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.ticker ? `${h.ticker} — ` : ""}{h.asset_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("transactions.quantity")} *
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
                    {t("transactions.pricePerUnit")} *
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={pricePerUnit}
                    onChange={(e) => setPricePerUnit(e.target.value)}
                    placeholder="185.00"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("transactions.feeLabel")}
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    placeholder="0.00"
                    className={`${inputClass} tabular-nums`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("transactions.date")}
                  </Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] font-medium text-muted-foreground">
                    {t("transactions.notes")}
                  </Label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("transactions.notesPlaceholder")}
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
              disabled={addTransaction.isPending}
              className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
            >
              {addTransaction.isPending ? t("portfolio.adding") : t("transactions.record")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
