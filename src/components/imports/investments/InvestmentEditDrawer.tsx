import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { SheetPanel, SHEET_BUTTON } from "../SheetPanel";
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

  const footer = (
    <Button
      className={cn(SHEET_BUTTON, "w-full")}
      disabled={!hasChanges}
      onClick={() => {
        onSave(inv, buildEdits());
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
      title={t("imports.editInvestment", "edit movement")}
      footer={footer}
    >
      <>
        {/* Type toggle — pill segmented control */}
        <div className="flex rounded-[9px] bg-muted p-1">
          {INVESTMENT_TYPES.map((it) => {
            const Icon = it.icon;
            const active = type === it.value;
            return (
              <button
                key={it.value}
                type="button"
                onClick={() => setType(it.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-[7px] py-2.5 text-xs font-semibold transition-all",
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
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">
            {t("imports.description", "Description")}
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">
            {t("imports.amount", "Amount")}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            placeholder="0,00"
            className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none tabular-nums font-medium text-sm px-3.5 focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Date + Platform row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2 min-w-0">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.date", "Date")}
            </label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none tabular-nums px-3.5 focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none"
            />
          </div>
          <div className="space-y-2 min-w-0">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("imports.platform", "Platform")}
            </label>
            <Input
              list="drawer-platforms"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="—"
              className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50"
            />
            <datalist id="drawer-platforms">
              {knownPlatforms.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>
        </div>

        {/* Asset type */}
        <div className="space-y-2">
          <label className="text-[13px] font-medium text-muted-foreground">
            {t("imports.asset", "Asset")}
          </label>
          <Select
            value={assetType || "__none__"}
            onValueChange={(v) => setAssetType(v === "__none__" ? null : v)}
          >
            <SelectTrigger className="h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus:bg-card focus:border-primary focus:ring-[3px] focus:ring-primary/[0.14] [&>svg]:opacity-40">
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
      </>
    </SheetPanel>
  );
}
