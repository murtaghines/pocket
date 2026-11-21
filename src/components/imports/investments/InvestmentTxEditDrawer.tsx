import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { SheetPanel, SHEET_BUTTON } from "../SheetPanel";
import { TX_TYPE_CONFIG } from "./types";
import type { InvestmentTransaction, PendingInvTxEdit } from "./types";

const TX_TYPES = ["buy", "sell", "dividend", "fee"] as const;
const CURRENCIES = ["USD", "EUR", "ARS", "GBP", "BRL"] as const;

interface InvestmentTxEditDrawerProps {
  tx: InvestmentTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (amount: number, currency?: string, showSign?: boolean) => string;
  onSave: (tx: InvestmentTransaction, edits: PendingInvTxEdit) => void;
}

export function InvestmentTxEditDrawer({
  tx,
  open,
  onOpenChange,
  formatCurrency,
  onSave,
}: InvestmentTxEditDrawerProps) {
  const { t } = useTranslation("common");

  const [type, setType] = useState<string>("buy");
  const [ticker, setTicker] = useState("");
  const [assetName, setAssetName] = useState("");
  const [qtyStr, setQtyStr] = useState("");
  const [priceStr, setPriceStr] = useState("");
  const [feeStr, setFeeStr] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (tx && open) {
      setType(tx.type || "buy");
      setTicker(tx.ticker || "");
      setAssetName(tx.asset_name || "");
      setQtyStr(String(tx.quantity).replace(".", ","));
      setPriceStr(String(tx.price_per_unit).replace(".", ","));
      setFeeStr(String(tx.fee).replace(".", ","));
      setCurrency(tx.currency || "USD");
      setDate(tx.date);
      setNotes(tx.notes || "");
    }
  }, [tx?.id, open]);

  if (!tx || !open) return null;

  const parseNum = (s: string) => {
    const n = parseFloat(s.replace(",", ".").trim());
    return isNaN(n) ? NaN : n;
  };

  const parsedQty = parseNum(qtyStr);
  const parsedPrice = parseNum(priceStr);
  const parsedFee = parseNum(feeStr);

  const hasChanges =
    type !== (tx.type || "buy") ||
    ticker !== (tx.ticker || "") ||
    assetName !== (tx.asset_name || "") ||
    (!isNaN(parsedQty) && parsedQty !== tx.quantity) ||
    (!isNaN(parsedPrice) && parsedPrice !== tx.price_per_unit) ||
    (!isNaN(parsedFee) && parsedFee !== tx.fee) ||
    currency !== (tx.currency || "USD") ||
    date !== tx.date ||
    notes !== (tx.notes || "");

  const buildEdits = (): PendingInvTxEdit => {
    const edits: PendingInvTxEdit = {};
    if (type !== (tx.type || "buy")) edits.type = type;
    if (ticker !== (tx.ticker || "")) edits.ticker = ticker || null;
    if (assetName !== (tx.asset_name || "")) edits.asset_name = assetName || null;
    if (!isNaN(parsedQty) && parsedQty !== tx.quantity) edits.quantity = parsedQty;
    if (!isNaN(parsedPrice) && parsedPrice !== tx.price_per_unit) edits.price_per_unit = parsedPrice;
    if (!isNaN(parsedFee) && parsedFee !== tx.fee) edits.fee = parsedFee;
    if (currency !== (tx.currency || "USD")) edits.currency = currency;
    if (date !== tx.date) edits.date = date;
    if (notes !== (tx.notes || "")) edits.notes = notes || null;
    return edits;
  };

  const inputCls = "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50";

  const footer = (
    <Button
      className={cn(SHEET_BUTTON, "w-full")}
      disabled={!hasChanges}
      onClick={() => {
        onSave(tx, buildEdits());
        onOpenChange(false);
      }}
    >
      {t("imports.save", "Save")}
    </Button>
  );

  return (
    <SheetPanel
      open={open}
      onOpenChange={onOpenChange}
      title={t("imports.editTransaction", "edit transaction")}
      footer={footer}
    >
      <>
        {/* Type toggle */}
        <div className="flex rounded-[9px] bg-muted p-1">
          {TX_TYPES.map((val) => {
            const cfg = TX_TYPE_CONFIG[val];
            const Icon = cfg.icon;
            const active = type === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => setType(val)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-xs font-semibold transition-all",
                  active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </button>
            );
          })}
        </div>

        {/* Ticker + Asset name */}
        <div className="grid grid-cols-[90px_1fr] gap-2">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.ticker", "Ticker")}
            </label>
            <Input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              className={cn(inputCls, "uppercase")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.assetName", "Asset name")}
            </label>
            <Input
              value={assetName}
              onChange={(e) => setAssetName(e.target.value)}
              placeholder="Apple Inc."
              className={inputCls}
            />
          </div>
        </div>

        {/* Qty + Price row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.qty", "Quantity")}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={qtyStr}
              onChange={(e) => setQtyStr(e.target.value)}
              placeholder="0"
              className={cn(inputCls, "tabular-nums")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.pricePerUnit", "Price / unit")}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="0,00"
              className={cn(inputCls, "tabular-nums")}
            />
          </div>
        </div>

        {/* Fee + Currency */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.fee", "Fee")}
            </label>
            <Input
              type="text"
              inputMode="decimal"
              value={feeStr}
              onChange={(e) => setFeeStr(e.target.value)}
              placeholder="0,00"
              className={cn(inputCls, "tabular-nums")}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.currency", "Currency")}
            </label>
            <div className="pk-select-wrap">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className={cn(inputCls, "w-full")}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">
            {t("imports.date", "Date")}
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={cn(inputCls, "tabular-nums")}
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">
            {t("imports.notes", "Notes")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={cn(inputCls, "h-auto py-3 resize-none")}
            placeholder={t("imports.notesPlaceholder", "Optional notes...")}
          />
        </div>
      </>
    </SheetPanel>
  );
}
