import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { SheetPanel, SHEET_BUTTON } from "@/components/imports/SheetPanel";
import { ACCOUNT_COLOR_PALETTE, getDefaultAccountColor } from "@/lib/accountColors";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import {
  type AccountType,
  getAccountTypeIcon,
  getAccountTypeI18nKey,
} from "@/lib/accountTypes";
import { AccountTypePicker } from "./AccountTypePicker";

export interface AccountFormValues {
  institution: string;
  name: string;
  color: string;
  account_type: AccountType;
  currency_base: string;
  account_number?: string;
  hidden_from_dashboard?: boolean;
}

interface AccountFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialValues?: Partial<AccountFormValues>;
  isSubmitting?: boolean;
  onSubmit: (values: AccountFormValues) => void;
  lockedType?: AccountType;
  typeFilter?: "bank" | "investment";
  defaultCurrency?: string;
}

export function AccountFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  isSubmitting,
  onSubmit,
  lockedType,
  typeFilter,
  defaultCurrency = "EUR",
}: AccountFormDialogProps) {
  const { t } = useTranslation("account");
  const { t: tp } = useTranslation("profile");
  const [step, setStep] = useState<"type" | "details">("type");
  const [accountType, setAccountType] = useState<AccountType>("CHECKING");
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [currencyBase, setCurrencyBase] = useState(defaultCurrency);
  const [accountNumber, setAccountNumber] = useState("");
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(false);

  useEffect(() => {
    if (open) {
      setInstitution(initialValues?.institution || "");
      setName(initialValues?.name || "");
      setColor(initialValues?.color || getDefaultAccountColor(0));
      setAccountType(initialValues?.account_type || lockedType || "CHECKING");
      setCurrencyBase(initialValues?.currency_base || defaultCurrency);
      setAccountNumber(initialValues?.account_number || "");
      setHiddenFromDashboard(initialValues?.hidden_from_dashboard ?? false);

      if (mode === "edit" || lockedType) {
        setStep("details");
      } else {
        setStep("type");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleTypeSelect = (type: AccountType) => {
    setAccountType(type);
    setStep("details");
  };

  const canSubmit = institution.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      institution: institution.trim(),
      name: name.trim(),
      color,
      account_type: accountType,
      currency_base: currencyBase,
      account_number: accountNumber.trim() || undefined,
      hidden_from_dashboard: hiddenFromDashboard,
    });
  };

  const TypeIcon = getAccountTypeIcon(accountType);
  const typeLabel = t(getAccountTypeI18nKey(accountType));

  const footer =
    step === "details" ? (
      <Button
        className={cn(SHEET_BUTTON, "w-full")}
        onClick={handleSubmit}
        disabled={!canSubmit}
      >
        {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {mode === "create" ? tp("accounts.create", "Create") : tp("accounts.save", "Save")}
      </Button>
    ) : null;

  return (
    <SheetPanel
      open={open}
      onOpenChange={onOpenChange}
      title={
        step === "type" ? (
          <span className="inline-flex items-center gap-2">
            {t("accounts.selectType")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <TypeIcon className="w-4 h-4 text-primary" />
            {mode === "create"
              ? tp("accounts.addAccount", "add account")
              : tp("accounts.editAccount", "edit account")}
          </span>
        )
      }
      footer={footer}
    >
      {step === "type" ? (
        <AccountTypePicker onSelect={handleTypeSelect} filter={typeFilter} />
      ) : (
        <>
          {/* Account type header (read-only in edit, or locked) */}
          <div className="flex items-center gap-3 rounded-xl bg-muted p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-primary/10 text-primary">
              <TypeIcon className="h-[18px] w-[18px]" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-semibold text-foreground">{typeLabel}</p>
              {mode === "edit" && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  {t("accounts.typeLocked")}
                </p>
              )}
            </div>
          </div>

          {/* Institution */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {tp("accounts.institution", "Bank")}
            </label>
            <Input
              placeholder={tp("accounts.institutionPlaceholder", "e.g. Revolut, Santander, BBVA")}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
              className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {tp("accounts.nickname", "Nickname")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tp("accounts.optional", "optional")})
              </span>
            </label>
            <Input
              placeholder={tp("accounts.nicknamePlaceholder", "e.g. Personal, Shared")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            />
            <p className="text-xs text-muted-foreground px-1">
              {institution.trim()
                ? tp("accounts.previewLabel", {
                    preview: name.trim()
                      ? `${institution.trim()} · ${name.trim()}`
                      : institution.trim(),
                    defaultValue: `Shown as "${name.trim() ? `${institution.trim()} · ${name.trim()}` : institution.trim()}"`,
                  })
                : tp("accounts.previewHint", "Shown wherever this account appears")}
            </p>
          </div>

          {/* Currency */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {t("accounts.currency", "Currency")}
            </label>
            <Select value={currencyBase} onValueChange={setCurrencyBase}>
              <SelectTrigger className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    <span className="tabular-nums">{c.code}</span>
                    <span className="text-muted-foreground ml-2">{c.symbol} — {c.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account number */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {t("accounts.accountNumber", "Account number")}{" "}
              <span className="font-normal text-muted-foreground">
                ({tp("accounts.optional", "optional")})
              </span>
            </label>
            <Input
              placeholder={t("accounts.accountNumberPlaceholder", "For your reference only")}
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              className="h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-foreground">
              {tp("accounts.color", "Color")}
            </label>
            <div className="rounded-2xl bg-muted p-4 space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLOR_PALETTE.blues.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform hover:scale-110",
                      color.toLowerCase() === c.toLowerCase()
                        ? "ring-2 ring-offset-2 ring-primary"
                        : "",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLOR_PALETTE.yellows.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-transform hover:scale-110",
                      color.toLowerCase() === c.toLowerCase()
                        ? "ring-2 ring-offset-2 ring-primary"
                        : "",
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Hidden from dashboard */}
          <div className="flex items-center justify-between rounded-xl bg-muted p-4">
            <label className="text-[13px] font-semibold text-foreground">
              {t("accounts.hiddenFromDashboard", "Hidden from dashboard")}
            </label>
            <Switch
              checked={hiddenFromDashboard}
              onCheckedChange={setHiddenFromDashboard}
            />
          </div>
        </>
      )}
    </SheetPanel>
  );
}
