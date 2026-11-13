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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp,
  TrendingDown,
  Pencil,
  Plus,
  Archive,
  ShoppingCart,
  Coins,
  Receipt,
} from "lucide-react";
import { useLocalization } from "@/hooks/useLocalization";
import { useInvestmentTransactions } from "@/hooks/useInvestmentTransactions";
import { usePortfolioRates } from "@/hooks/usePortfolioRates";
import type { Holding } from "@/hooks/useHoldings";
import { useHoldings } from "@/hooks/useHoldings";
import { UpdatePricePopover } from "./UpdatePricePopover";
import { RecordTransactionDialog } from "../RecordTransactionDialog";
import { EditHoldingDialog } from "./EditHoldingDialog";
import { TaxLotsSection } from "./TaxLotsSection";
import { ASSET_CLASS_CONFIG, assetColorAlpha, assetColorDarken } from "./assetClassConfig";

interface HoldingDetailDialogProps {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TX_ICON = {
  buy: ShoppingCart,
  sell: TrendingDown,
  dividend: Coins,
  fee: Receipt,
} as const;

const TX_COLOR = {
  buy: "text-success",
  sell: "text-destructive",
  dividend: "text-[hsl(var(--dividend))]",
  fee: "text-warning",
} as const;

export function HoldingDetailDialog({
  holding,
  open,
  onOpenChange,
}: HoldingDetailDialogProps) {
  const { t } = useTranslation("investments");
  const { formatCurrency, formatDate, baseCurrency } = useLocalization();
  const { transactions, isLoading } = useInvestmentTransactions(holding.id);
  const { deleteHolding } = useHoldings();
  const { convert } = usePortfolioRates();

  const isOtherCurrency = holding.currency !== baseCurrency;
  const convertedValue = isOtherCurrency
    ? convert(holding.current_value, holding.currency, baseCurrency)
    : null;
  const convertedPnl = isOtherCurrency
    ? convert(holding.unrealized_pnl, holding.currency, baseCurrency)
    : null;
  const [showPrice, setShowPrice] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const cfg = ASSET_CLASS_CONFIG[holding.asset_class] ?? ASSET_CLASS_CONFIG.other;
  const pnlPct =
    holding.cost_basis > 0
      ? (holding.unrealized_pnl / holding.cost_basis) * 100
      : 0;
  const isPositive = holding.unrealized_pnl > 0;
  const isZeroPnl = holding.unrealized_pnl === 0;

  const handleClosePosition = async () => {
    await deleteHolding.mutateAsync(holding.id);
    setShowCloseConfirm(false);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: assetColorAlpha(cfg, 0.15),
                  color: assetColorDarken(cfg),
                }}
              >
                {(holding.ticker ?? holding.asset_name).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-left">{holding.asset_name}</DialogTitle>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {holding.ticker && (
                    <span className="text-xs text-muted-foreground font-mono">
                      {holding.ticker}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {t(`byAssetType.types.${cfg.i18nKey}`)}
                  </Badge>
                </div>
              </div>
            </div>
          </DialogHeader>
          <DialogBody>
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-muted rounded-xl p-3">
                <p className="text-[13px] font-medium text-muted-foreground">
                  {t("portfolio.value")}
                  {isOtherCurrency && (
                    <span className="ml-1 font-mono">{holding.currency}</span>
                  )}
                </p>
                <p className="text-lg font-bold tabular-nums mt-0.5">
                  {formatCurrency(holding.current_value, holding.currency)}
                </p>
                {convertedValue?.hasRate && (
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    ≈ {formatCurrency(convertedValue.converted, baseCurrency)}
                  </p>
                )}
              </div>
              <div className="bg-muted rounded-xl p-3">
                <p className="text-[13px] font-medium text-muted-foreground">
                  {t("portfolio.pnl")}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {!isZeroPnl && (isPositive ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  ))}
                  <span
                    className={`text-lg font-bold tabular-nums ${isZeroPnl ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"}`}
                  >
                    {isPositive ? "+" : ""}
                    {pnlPct.toFixed(1)}%
                  </span>
                </div>
                <p
                  className={`text-xs tabular-nums mt-0.5 ${isZeroPnl ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"}`}
                >
                  {formatCurrency(holding.unrealized_pnl, holding.currency)}
                </p>
                {convertedPnl?.hasRate && (
                  <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                    ≈ {formatCurrency(convertedPnl.converted, baseCurrency)}
                  </p>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-y-2 text-sm mb-4">
              <span className="text-muted-foreground">{t("portfolio.quantity")}</span>
              <span className="text-right font-medium tabular-nums">{holding.quantity}</span>
              <span className="text-muted-foreground">{t("portfolio.avgCost")}</span>
              <span className="text-right font-medium tabular-nums">
                {formatCurrency(holding.avg_cost_per_unit)}
              </span>
              <span className="text-muted-foreground">{t("portfolio.price")}</span>
              <span className="text-right font-medium tabular-nums">
                <button
                  onClick={() => setShowPrice(true)}
                  className="inline-flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {holding.current_price != null
                    ? formatCurrency(holding.current_price)
                    : "—"}
                  <Pencil className="w-3 h-3 opacity-50" />
                </button>
              </span>
              <span className="text-muted-foreground">{t("portfolio.costBasis")}</span>
              <span className="text-right font-medium tabular-nums">
                {formatCurrency(holding.cost_basis, holding.currency)}
              </span>
              {isOtherCurrency && (
                <>
                  <span className="text-muted-foreground">{t("multicurrency.currency")}</span>
                  <span className="text-right font-medium font-mono">{holding.currency}</span>
                </>
              )}
            </div>

            {holding.notes && (
              <p className="text-sm text-muted-foreground mb-4 italic">{holding.notes}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowRecord(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                {t("transactions.record")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowPrice(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("portfolio.updatePrice")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => setShowEdit(true)}
              >
                <Pencil className="w-3.5 h-3.5" />
                {t("portfolio.editHolding")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive hover:text-destructive ml-auto"
                onClick={() => setShowCloseConfirm(true)}
                disabled={deleteHolding.isPending}
              >
                <Archive className="w-3.5 h-3.5" />
                {t("portfolio.closePosition")}
              </Button>
            </div>

            {/* Tax lots */}
            <TaxLotsSection holdingId={holding.id} currency={holding.currency} />

            {/* Transaction history */}
            <div className="border-t border-border pt-3">
              <p className="text-sm font-semibold mb-2">{t("transactions.title")}</p>
              {isLoading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">...</p>
              ) : transactions.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {t("transactions.noTransactions")}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
                  {transactions.map((tx) => {
                    const Icon =
                      TX_ICON[tx.type as keyof typeof TX_ICON] ?? ShoppingCart;
                    const color =
                      TX_COLOR[tx.type as keyof typeof TX_COLOR] ?? "text-muted-foreground";
                    const amount =
                      tx.type === "sell" || tx.type === "fee"
                        ? -tx.total_amount
                        : tx.total_amount;
                    return (
                      <div
                        key={tx.id}
                        className="flex items-center gap-2 text-sm p-2 bg-background border border-border rounded-lg"
                      >
                        <div
                          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                            tx.type === "buy"
                              ? "bg-success/15"
                              : tx.type === "sell"
                                ? "bg-destructive/15"
                                : tx.type === "dividend"
                                  ? "bg-[hsl(var(--dividend))]/15"
                                  : "bg-warning/15"
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {t(`transactions.${tx.type}`)}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground">
                              {formatDate(tx.date)}
                            </span>
                          </div>
                          {tx.quantity > 0 && (
                            <p className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                              {tx.quantity} × {formatCurrency(tx.price_per_unit)}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-sm font-semibold tabular-nums ${
                            amount > 0
                              ? "text-success"
                              : amount < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {formatCurrency(amount, undefined, true)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {showPrice && (
        <UpdatePricePopover
          holdingId={holding.id}
          currentPrice={holding.current_price}
          onClose={() => setShowPrice(false)}
        />
      )}
      <RecordTransactionDialog
        open={showRecord}
        onOpenChange={setShowRecord}
        preselectedHolding={holding}
      />
      <EditHoldingDialog
        holding={holding}
        open={showEdit}
        onOpenChange={setShowEdit}
      />
      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("portfolio.closePosition")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("portfolio.confirmClose")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("portfolio.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClosePosition}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("portfolio.closePosition")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
