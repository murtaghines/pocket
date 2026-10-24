import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getAccountColor } from "@/lib/accountColors";
import { SUPPORTED_CURRENCIES } from "@/lib/currencies";
import {
  type AccountType,
  BANK_ACCOUNT_TYPES,
  INVESTMENT_ACCOUNT_TYPES,
  ACCOUNT_TYPES,
  getAccountTypeIcon,
  getAccountTypeI18nKey,
  deriveAccountRole,
  deriveDomainDefault,
  isSharedType,
} from "@/lib/accountTypes";

export interface AccountFormValues {
  institution: string;
  name: string;
  color: string;
  account_type: AccountType;
  currency_base: string;
  initial_balance?: number;
  split_percentage?: number;
  partner_name?: string;
  notes?: string;
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
  const [currencyBase, setCurrencyBase] = useState(defaultCurrency);
  const [initialBalance, setInitialBalance] = useState("");
  const [splitPercentage, setSplitPercentage] = useState("50");
  const [partnerName, setPartnerName] = useState("");
  const [notes, setNotes] = useState("");
  const [hideFromDashboard, setHideFromDashboard] = useState(false);

  useEffect(() => {
    if (open) {
      const defaultType = lockedType
        || initialValues?.account_type
        || (typeFilter === "investment" ? "BROKERAGE" : "CHECKING");
      setAccountType(defaultType);
      setInstitution(initialValues?.institution || "");
      setName(initialValues?.name || "");
      setCurrencyBase(initialValues?.currency_base || defaultCurrency);
      setInitialBalance(
        initialValues?.initial_balance != null && initialValues.initial_balance !== 0
          ? String(initialValues.initial_balance)
          : "",
      );
      setSplitPercentage(
        initialValues?.split_percentage != null
          ? String(initialValues.split_percentage)
          : "50",
      );
      setPartnerName(initialValues?.partner_name || "");
      setNotes(initialValues?.notes || "");
      setHideFromDashboard(initialValues?.hidden_from_dashboard ?? false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const availableTypes = getAvailableTypes(mode, accountType, typeFilter, lockedType);
  const isTypeLocked = !!lockedType || availableTypes.length === 1;

  const canSubmit = institution.trim().length > 0 && !isSubmitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const parsedBalance = parseFloat(initialBalance.replace(",", "."));
    const parsedSplit = parseInt(splitPercentage, 10);
    onSubmit({
      institution: institution.trim(),
      name: name.trim(),
      color: getAccountColor({ account_type: accountType }),
      account_type: accountType,
      currency_base: currencyBase,
      initial_balance: Number.isFinite(parsedBalance) ? parsedBalance : 0,
      split_percentage: isSharedType(accountType) && parsedSplit > 0 && parsedSplit <= 100
        ? parsedSplit
        : 100,
      partner_name: isSharedType(accountType) ? partnerName.trim() || undefined : undefined,
      notes: notes.trim() || undefined,
      hidden_from_dashboard: hideFromDashboard,
    });
  };

  const TypeIcon = getAccountTypeIcon(accountType);
  const isInvestmentType = deriveDomainDefault(accountType) === "INVESTING";

  const inputClass =
    "h-11 rounded-xl bg-muted border-[1.5px] border-transparent shadow-none px-3.5 text-sm font-medium focus-visible:bg-card focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/[0.14] focus-visible:outline-none placeholder:text-muted-foreground/50";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
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

        <DialogBody>
          {/* Account type */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("accounts.accountType", "Account type")}
            </label>
            {isTypeLocked ? (
              <div className="flex items-center gap-2.5 h-11 rounded-xl bg-muted px-3.5">
                <TypeIcon className="w-4 h-4 text-muted-foreground" strokeWidth={2} />
                <span className="text-[13px] text-foreground">
                  {t(getAccountTypeI18nKey(accountType))}
                </span>
              </div>
            ) : (
              <div className="pk-select-wrap">
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as AccountType)}
                  className={inputClass}
                >
                  {availableTypes.map((type) => (
                    <option key={type} value={type}>
                      {t(getAccountTypeI18nKey(type))}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Institution / Platform */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {isInvestmentType
                ? t("accounts.platform", "Platform")
                : tp("accounts.institution", "Bank")}
            </label>
            <Input
              placeholder={isInvestmentType
                ? t("accounts.platformPlaceholder", "e.g. Degiro, Interactive Brokers, Binance")
                : tp("accounts.institutionPlaceholder", "e.g. Revolut, Santander, BBVA")}
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

          {/* Currency */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("accounts.currency", "Currency")}
            </label>
            <div className="pk-select-wrap">
              <select
                value={currencyBase}
                onChange={(e) => setCurrencyBase(e.target.value)}
                className={inputClass}
              >
                {SUPPORTED_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} {c.symbol} — {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Initial balance */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-muted-foreground">
              {t("accounts.initialBalance", "Initial balance")}{" "}
              <span className="text-muted-foreground/60">
                ({tp("accounts.optional", "optional")})
              </span>
            </label>
            <Input
              placeholder={t("accounts.initialBalancePlaceholder", "0,00")}
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              inputMode="decimal"
              className={cn(inputClass, "tabular-nums")}
            />
            <p className="text-xs text-muted-foreground px-1">
              {accountType === "CASH"
                ? t("accounts.initialBalanceHelpCash", "How much cash is in this wallet right now")
                : t("accounts.initialBalanceHelpFile", "Auto-set from your first statement. You can also set it manually.")}
            </p>
          </div>

          {/* Split percentage — only for JOINT accounts */}
          {isSharedType(accountType) && (
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-muted-foreground">
                {t("accounts.splitPercentage", "Your share (%)")}
              </label>
              <Input
                placeholder="50"
                value={splitPercentage}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "");
                  if (v === "" || (parseInt(v, 10) >= 0 && parseInt(v, 10) <= 100)) {
                    setSplitPercentage(v);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                inputMode="numeric"
                className={cn(inputClass, "tabular-nums")}
              />
              <p className="text-xs text-muted-foreground px-1">
                {t("accounts.splitPercentageHelp", "Your percentage of this shared account. E.g. 50 means you pay half.")}
              </p>
            </div>
          )}

          {/* Co-holder name — only for JOINT accounts */}
          {isSharedType(accountType) && (
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-muted-foreground">
                {t("accounts.coHolderName", "Co-holder name")}{" "}
                <span className="text-muted-foreground/60">
                  ({tp("accounts.optional", "optional")})
                </span>
              </label>
              <Input
                placeholder={t("accounts.coHolderPlaceholder", "e.g. Ana Ruiz")}
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground px-1">
                {t("accounts.coHolderHelp", "As it appears on your bank statements — helps detect transfers")}
              </p>
            </div>
          )}

        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            className="h-12 rounded-[14px] px-6 text-[15px] font-semibold border-0 bg-muted text-foreground hover:bg-[hsl(220,13%,91%)]"
            onClick={() => onOpenChange(false)}
          >
            {t("accounts.cancel", "Cancel")}
          </Button>
          <Button
            className="h-12 rounded-[14px] px-6 text-[15px] font-semibold min-w-[140px]"
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
