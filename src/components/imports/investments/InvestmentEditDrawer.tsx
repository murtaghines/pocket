import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PillBadge } from "@/components/ui/pill-badge";
import { INVESTMENT_TYPES, ASSET_TYPES, getTypeMeta } from "./types";
import type { Investment, PendingInvEdit } from "./types";

interface InvestmentEditDrawerProps {
  inv: Investment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formatCurrency: (amount: number) => string;
  knownPlatforms: string[];
  onSave: (inv: Investment, edits: PendingInvEdit) => void;
  onToggleHidden: (inv: Investment) => void;
}

export function InvestmentEditDrawer({
  inv,
  open,
  onOpenChange,
  formatCurrency,
  knownPlatforms,
  onSave,
  onToggleHidden,
}: InvestmentEditDrawerProps) {
  const { t } = useTranslation("common");

  const [type, setType] = useState("");
  const [platform, setPlatform] = useState("");
  const [assetType, setAssetType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState("");

  useEffect(() => {
    if (inv && open) {
      setType(inv.type || "deposit");
      setPlatform(inv.platform || "");
      setAssetType(inv.asset_type || null);
      setDescription(inv.description || "");
      setAmount(inv.amount);
      setDate(inv.date);
    }
  }, [inv?.id, open]);

  if (!inv) return null;

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

  const meta = getTypeMeta(type);
  const TypeIcon = meta.icon;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("imports.editInvestment", "Edit movement")}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 space-y-4 pb-2">
          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("imports.description", "Description")}
            </label>
            <Input
              value={description}
              disabled={inv.is_hidden}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("imports.date", "Date")}
              </label>
              <Input
                type="date"
                value={date}
                disabled={inv.is_hidden}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("imports.amount", "Amount")}
              </label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                disabled={inv.is_hidden}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) setAmount(v);
                }}
                className="tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("imports.type", "Type")}
            </label>
            <Select value={type} disabled={inv.is_hidden} onValueChange={setType}>
              <SelectTrigger className="h-11">
                <SelectValue>
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4" />
                    <PillBadge variant="solid" tone={meta.tone}>
                      {meta.label}
                    </PillBadge>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map((it) => (
                  <SelectItem key={it.value} value={it.value}>
                    <div className="flex items-center gap-2">
                      <it.icon className="h-4 w-4" />
                      {it.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("imports.platform", "Platform")}
              </label>
              <Input
                list="drawer-platforms"
                value={platform}
                disabled={inv.is_hidden}
                onChange={(e) => setPlatform(e.target.value)}
              />
              <datalist id="drawer-platforms">
                {knownPlatforms.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("imports.asset", "Asset")}
              </label>
              <Select
                value={assetType || "__none__"}
                disabled={inv.is_hidden}
                onValueChange={(v) => setAssetType(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="—" />
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

          <button
            type="button"
            onClick={() => {
              onToggleHidden(inv);
              onOpenChange(false);
            }}
            className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
          >
            {inv.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {inv.is_hidden
              ? t("imports.includeInTotals", "Include in totals")
              : t("imports.hideFromTotals", "Hide from totals")}
          </button>
        </div>

        <DrawerFooter>
          <Button
            disabled={!hasChanges || inv.is_hidden}
            onClick={() => {
              onSave(inv, buildEdits());
              onOpenChange(false);
            }}
          >
            {t("imports.save", "Save")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("imports.cancel", "Cancel")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
