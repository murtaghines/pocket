import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INVESTMENT_TYPES, ASSET_TYPES } from "./types";
import type { Investment, PendingInvEdit } from "./types";

interface InvestmentEditDrawerProps {
  inv: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (amount: number) => string;
  knownPlatforms: string[];
  onSave: (inv: Investment, edits: PendingInvEdit) => void;
}

export function InvestmentEditDrawer({
  inv,
  open,
  onOpenChange,
  formatCurrency,
  knownPlatforms,
  onSave,
}: InvestmentEditDrawerProps) {
  const { t } = useTranslation("common");

  const [type, setType] = useState("");
  const [platform, setPlatform] = useState("");
  const [assetType, setAssetType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amountStr, setAmountStr] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    if (inv && open) {
      setType(inv.type || "deposit");
      setPlatform(inv.platform || "");
      setAssetType(inv.asset_type || null);
      setDescription(inv.description || "");
      setAmountStr(String(Math.abs(inv.amount)).replace(".", ","));
      setDate(inv.date);
    }
  }, [inv?.id, open]);

  if (!inv || !open) return null;

  const parseNum = (s: string) => {
    const n = parseFloat(s.replace(",", ".").trim());
    return isNaN(n) ? NaN : n;
  };

  const parsedAmount = parseNum(amountStr);
  const amount = isNaN(parsedAmount) ? inv.amount : parsedAmount;

  const hasChanges =
    type !== (inv.type || "deposit") ||
    platform !== (inv.platform || "") ||
    assetType !== (inv.asset_type || null) ||
    description !== (inv.description || "") ||
    amount !== inv.amount ||
    date !== inv.date;

  const buildEdits = (): PendingInvEdit => {
    const edits: PendingInvEdit = {};
    if (type !== (inv.type || "deposit")) edits.type = type;
    if (platform !== (inv.platform || "")) edits.platform = platform;
    if (assetType !== (inv.asset_type || null)) edits.asset_type = assetType;
    if (description !== (inv.description || "")) edits.description = description;
    if (amount !== inv.amount) edits.amount = amount;
    if (date !== inv.date) edits.date = date;
    return edits;
  };

  const panel = (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
        open ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground">
          {t("imports.editTransaction", "Edit transaction")}
        </span>
        <div className="w-9" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Type toggle — segmented control */}
        <div className="flex rounded-xl bg-muted p-1">
          {INVESTMENT_TYPES.map((it) => {
            const Icon = it.icon;
            const active = type === it.value;
            return (
              <button
                key={it.value}
                type="button"
                onClick={() => setType(it.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-all",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {it.label}
              </button>
            );
          })}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.description", "Description")}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-xl bg-muted border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Date */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.date", "Date")}
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 rounded-xl bg-muted border-0 shadow-none tabular-nums focus-visible:ring-1 focus-visible:ring-primary"
          />
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.amount", "Amount")}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0,00"
            className="h-11 rounded-xl bg-muted border-0 shadow-none tabular-nums font-semibold focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Platform */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.platform", "Platform")}
          </label>
          <Input
            list="drawer-platforms"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            placeholder="—"
            className="h-11 rounded-xl bg-muted border-0 shadow-none focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
          />
          <datalist id="drawer-platforms">
            {knownPlatforms.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>

        {/* Asset type */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t("imports.asset", "Asset")}
          </label>
          <Select
            value={assetType || "__none__"}
            onValueChange={(v) => setAssetType(v === "__none__" ? null : v)}
          >
            <SelectTrigger className="h-11 rounded-xl bg-muted border-0 shadow-none focus:ring-1 focus:ring-primary [&>svg]:opacity-40">
              <SelectValue placeholder="—">
                <span className="text-sm font-medium">{assetType || "—"}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {ASSET_TYPES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 pb-6 pt-3 bg-background space-y-2">
        <Button
          className="w-full h-12 rounded-xl"
          disabled={!hasChanges}
          onClick={() => {
            onSave(inv, buildEdits());
            onOpenChange(false);
          }}
        >
          {t("imports.save", "Save")}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-10 rounded-xl text-muted-foreground"
          onClick={() => onOpenChange(false)}
        >
          {t("imports.cancel", "Cancel")}
        </Button>
      </div>
    </div>
  );

  return createPortal(panel, document.body);
}
