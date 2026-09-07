import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  type AccountType,
  ACCOUNT_TYPES,
  BANK_ACCOUNT_TYPES,
  INVESTMENT_ACCOUNT_TYPES,
  getAccountTypeIcon,
  getAccountTypeI18nKey,
  getAccountTypeDescriptionKey,
} from "@/lib/accountTypes";

interface AccountTypePickerProps {
  onSelect: (type: AccountType) => void;
  filter?: "bank" | "investment";
}

export function AccountTypePicker({ onSelect, filter }: AccountTypePickerProps) {
  const { t } = useTranslation("account");

  const types =
    filter === "bank"
      ? BANK_ACCOUNT_TYPES
      : filter === "investment"
        ? INVESTMENT_ACCOUNT_TYPES
        : ACCOUNT_TYPES;

  return (
    <div className="space-y-4">
      <p className="text-[13px] font-semibold text-foreground">
        {t("accounts.selectType")}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {types.map((type) => {
          const Icon = getAccountTypeIcon(type);
          return (
            <button
              key={type}
              type="button"
              onClick={() => onSelect(type)}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border border-border p-4",
                "text-left transition-colors",
                "hover:border-primary/40 hover:bg-accent/50",
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="text-[13.5px] font-semibold text-foreground">
                  {t(getAccountTypeI18nKey(type))}
                </p>
                <p className="text-[12px] text-muted-foreground leading-snug mt-0.5">
                  {t(getAccountTypeDescriptionKey(type))}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
