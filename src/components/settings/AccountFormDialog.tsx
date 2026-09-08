import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_COLOR_PALETTE, getDefaultAccountColor } from "@/lib/accountColors";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import {
  type AccountType,
  BANK_ACCOUNT_TYPES,
  INVESTMENT_ACCOUNT_TYPES,
  ACCOUNT_TYPES,
  getAccountTypeIcon,
  getAccountTypeI18nKey,
  deriveAccountRole,
} from "@/lib/accountTypes";

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

function getAvailableTypes(
  mode: "create" | "edit",
  currentType: AccountType,
  typeFilter?: "bank" | "investment",
  lockedType?: AccountType,
): AccountType[] {
  if (lockedType) return [lockedType];
  if (mode === "edit") {
    const role = deriveAccountRole(currentType);
    return role === "INVESTMENT" ? INVESTMENT_ACCOUNT_TYPES : BANK_ACCOUNT_TYPES;
  }
  if (typeFilter === "bank") return BANK_ACCOUNT_TYPES;
  if (typeFilter === "investment") return INVESTMENT_ACCOUNT_TYPES;
  return ACCOUNT_TYPES;
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
  const [accountType, setAccountType] = useState<AccountType>("CHECKING");
  const [institution, setInstitution] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("");
  const [currencyBase, setCurrencyBase] = useState(defaultCurrency);
  const [accountNumber, setAccountNumber] = useState("");
  const [hiddenFromDashboard, setHiddenFromDashboard] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultType = lockedType
        || initialValues?.account_type
        || (typeFilter === "investment" ? "INVESTMENTS" : "CHECKING");
      setAccountType(defaultType);
      setInstitution(initialValues?.institution || "");
      setName(initialValues?.name || "");
      setColor(initialValues?.color || getDefaultAccountColor(0));
      setCurrencyBase(initialValues?.currency_base || defaultCurrency);
      setAccountNumber(initialValues?.account_number || "");
      setHiddenFromDashboard(initialValues?.hidden_from_dashboard ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const availableTypes = getAvailableTypes(mode, accountType, typeFilter, lockedType);
  const isTypeLocked = !!lockedType || availableTypes.length === 1;

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

  const inputClass =
    "h-11 rounded-full bg-muted border-0 shadow-none px-5 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-muted-foreground/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {mode === "create"
              ? tp("accounts.addAccount", "Add account")
              : tp("accounts.editAccount", "Edit account")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "create"
              ? t("accounts.selectType")
              : tp("accounts.editAccount", "Edit account")}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Account type */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("accounts.accountType", "Account type")}
            </label>
            {isTypeLocked ? (
              <div className="flex items-center gap-2.5 h-11 rounded-full bg-muted px-5">
                <TypeIcon className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <span className="text-[13px] text-foreground">
                  {t(getAccountTypeI18nKey(accountType))}
                </span>
              </div>
            ) : (
              <Select value={accountType} onValueChange={(v) => setAccountType(v as AccountType)}>
                <SelectTrigger className={cn(inputClass, "[&>svg]:opacity-40")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => {
                    const Icon = getAccountTypeIcon(type);
                    return (
                      <SelectItem key={type} value={type}>
                        <span className="inline-flex items-center gap-2">
                          <Icon className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                          {t(getAccountTypeI18nKey(type))}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Institution */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {tp("accounts.institution", "Bank")}
            </label>
            <Input
              placeholder={tp("accounts.institutionPlaceholder", "e.g. Revolut, Santander, BBVA")}
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
              className={inputClass}
            />
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {tp("accounts.nickname", "Nickname")}{" "}
              <span className="text-muted-foreground/60">
                ({tp("accounts.optional", "optional")})
              </span>
            </label>
            <Input
              placeholder={tp("accounts.nicknamePlaceholder", "e.g. Personal, Shared")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className={inputClass}
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

          {/* Currency + Account number — two-column on wider screens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-muted-foreground">
                {t("accounts.currency", "Currency")}
              </label>
              <Select value={currencyBase} onValueChange={setCurrencyBase}>
                <SelectTrigger className={cn(inputClass, "[&>svg]:opacity-40")}>
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
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-muted-foreground">
                {t("accounts.accountNumber", "Account number")}{" "}
                <span className="text-muted-foreground/60">
                  ({tp("accounts.optional", "optional")})
                </span>
              </label>
              <Input
                placeholder={t("accounts.accountNumberPlaceholder", "For your reference only")}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
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
            <label className="text-[13px] font-medium text-foreground">
              {t("accounts.hiddenFromDashboard", "Hidden from dashboard")}
            </label>
            <Switch
              checked={hiddenFromDashboard}
              onCheckedChange={setHiddenFromDashboard}
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 flex-row gap-3 sm:gap-3">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-full"
            onClick={() => onOpenChange(false)}
          >
            {t("accounts.cancel", "Cancel")}
          </Button>
          <Button
            className="flex-1 h-11 rounded-full font-semibold"
            onClick={handleSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === "create" ? tp("accounts.create", "Create") : tp("accounts.save", "Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
