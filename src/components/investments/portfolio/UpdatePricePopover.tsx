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
import { toast } from "sonner";
import { useHoldings } from "@/hooks/useHoldings";

interface UpdatePricePopoverProps {
  holdingId: string;
  currentPrice: number | null;
  onClose: () => void;
}

export function UpdatePricePopover({
  holdingId,
  currentPrice,
  onClose,
}: UpdatePricePopoverProps) {
  const { t } = useTranslation("investments");
  const { updatePrice } = useHoldings();
  const [price, setPrice] = useState(currentPrice?.toString() ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!price) return;

    try {
      await updatePrice.mutateAsync({ id: holdingId, price: parseFloat(price) });
      toast.success(t("portfolio.priceUpdated"));
      onClose();
    } catch {
      toast.error(t("portfolio.errorUpdating"));
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle>{t("portfolio.updatePrice")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <div className="flex flex-col gap-1.5">
              <Label className="text-[13px] font-medium text-muted-foreground">
                {t("portfolio.newPrice")}
              </Label>
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                autoFocus
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium tabular-nums focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none"
              />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="h-10 rounded-xl">
              {t("portfolio.cancel")}
            </Button>
            <Button type="submit" disabled={updatePrice.isPending} className="h-10 rounded-xl">
              {t("portfolio.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
