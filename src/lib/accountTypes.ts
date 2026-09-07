import type { LucideIcon } from "lucide-react";
import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  HandCoins,
  Building2,
} from "lucide-react";

export type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CREDIT_CARD"
  | "CASH"
  | "INVESTMENTS"
  | "LOAN"
  | "OTHER";

export const ACCOUNT_TYPES: AccountType[] = [
  "CASH",
  "CHECKING",
  "CREDIT_CARD",
  "SAVINGS",
  "INVESTMENTS",
  "LOAN",
  "OTHER",
];

export const BANK_ACCOUNT_TYPES: AccountType[] = [
  "CASH",
  "CHECKING",
  "CREDIT_CARD",
  "SAVINGS",
  "LOAN",
  "OTHER",
];

export const INVESTMENT_ACCOUNT_TYPES: AccountType[] = ["INVESTMENTS"];

const TYPE_TO_ROLE: Record<AccountType, "CASH" | "INVESTMENT"> = {
  CHECKING: "CASH",
  SAVINGS: "CASH",
  CREDIT_CARD: "CASH",
  CASH: "CASH",
  INVESTMENTS: "INVESTMENT",
  LOAN: "CASH",
  OTHER: "CASH",
};

const TYPE_TO_DOMAIN: Record<AccountType, "CASHFLOW" | "INVESTING"> = {
  CHECKING: "CASHFLOW",
  SAVINGS: "CASHFLOW",
  CREDIT_CARD: "CASHFLOW",
  CASH: "CASHFLOW",
  INVESTMENTS: "INVESTING",
  LOAN: "CASHFLOW",
  OTHER: "CASHFLOW",
};

const TYPE_ICONS: Record<AccountType, LucideIcon> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  INVESTMENTS: TrendingUp,
  LOAN: HandCoins,
  OTHER: Building2,
};

export function deriveAccountRole(type: AccountType): "CASH" | "INVESTMENT" {
  return TYPE_TO_ROLE[type];
}

export function deriveDomainDefault(type: AccountType): "CASHFLOW" | "INVESTING" {
  return TYPE_TO_DOMAIN[type];
}

export function getAccountTypeIcon(type: AccountType | null | undefined): LucideIcon {
  return TYPE_ICONS[type ?? "CHECKING"] ?? Landmark;
}

export function getAccountTypeI18nKey(type: AccountType): string {
  const keys: Record<AccountType, string> = {
    CHECKING: "accountTypes.checking",
    SAVINGS: "accountTypes.savings",
    CREDIT_CARD: "accountTypes.credit_card",
    CASH: "accountTypes.cash",
    INVESTMENTS: "accountTypes.investments",
    LOAN: "accountTypes.loan",
    OTHER: "accountTypes.other",
  };
  return keys[type];
}

export function getAccountTypeDescriptionKey(type: AccountType): string {
  const keys: Record<AccountType, string> = {
    CHECKING: "accountTypeDescriptions.checking",
    SAVINGS: "accountTypeDescriptions.savings",
    CREDIT_CARD: "accountTypeDescriptions.credit_card",
    CASH: "accountTypeDescriptions.cash",
    INVESTMENTS: "accountTypeDescriptions.investments",
    LOAN: "accountTypeDescriptions.loan",
    OTHER: "accountTypeDescriptions.other",
  };
  return keys[type];
}
