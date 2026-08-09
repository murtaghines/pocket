import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Drawer,
  DrawerContent,
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
import { INVESTMENT_TYPES, ASSET_TYPES, getTypeMeta } from "./types";
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
        <div className="px-4 pt-2 pb-1">
          {/* Type selector as segmented toggle */}
          <div className="flex gap-2 mb-4">
            {INVESTMENT_TYPES.map((it) => {
              const active = type === it.value;
              const toneClass: Record<string, string> = {
                green: "border-success bg-success/10 text-success",
                red: "border-destructive bg-destructive/10 text-destructive",
                amber: "border-warning bg-warning/10 text-warning",
                neutral: "border-muted-foreground bg-muted text-muted-foreground",
              };
              return (
                <button
                  key={it.value}
                  type="button"
                  onClick={() => setType(it.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? toneClass[it.tone] || "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </button>
              );
            })}
          </div>

          {/* Form rows */}
          <div className="divide-y divide-border/60">
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.description", "Description")}</span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-auto w-[60%] border-0 bg-transparent p-0 text-right text-sm font-medium shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.date", "Date")}</span>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-auto w-auto border-0 bg-transparent p-0 text-right text-sm font-medium shadow-none focus-visible:ring-0 tabular-nums"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.amount", "Amount")}</span>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!Number.isNaN(v)) setAmount(v);
                }}
                className="h-auto w-32 border-0 bg-transparent p-0 text-right text-sm font-semibold tabular-nums shadow-none focus-visible:ring-0"
              />
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.platform", "Platform")}</span>
              <Input
                list="drawer-platforms"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder="—"
                className="h-auto w-[50%] border-0 bg-transparent p-0 text-right text-sm font-medium shadow-none focus-visible:ring-0"
              />
              <datalist id="drawer-platforms">
                {knownPlatforms.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>

            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-muted-foreground">{t("imports.asset", "Asset")}</span>
              <Select
                value={assetType || "__none__"}
                onValueChange={(v) => setAssetType(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 gap-1.5 focus:ring-0 focus:ring-offset-0 [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:opacity-40">
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
        </div>

        <DrawerFooter>
          <Button
            disabled={!hasChanges}
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
