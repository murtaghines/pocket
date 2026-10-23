import type { LucideIcon } from "lucide-react";
import {
  Landmark,
  PiggyBank,
  CreditCard,
  Wallet,
  TrendingUp,
  HandCoins,
  Building2,
  Users,
  BarChart3,
  Bitcoin,
  Shield,
  Home,
  Layers,
} from "lucide-react";

export type AccountType =
  | "CHECKING"
  | "SAVINGS"
  | "CREDIT_CARD"
  | "CASH"
  | "INVESTMENTS"
  | "LOAN"
  | "OTHER"
  | "JOINT"
  | "JOINT_SAVINGS"
  | "BROKERAGE"
  | "CRYPTO"
  | "RETIREMENT"
  | "REAL_ESTATE"
  | "OTHER_INVESTMENT";

export const ACCOUNT_TYPES: AccountType[] = [
  "CASH",
  "CHECKING",
  "CREDIT_CARD",
  "SAVINGS",
  "JOINT",
  "JOINT_SAVINGS",
  "LOAN",
  "OTHER",
  "BROKERAGE",
  "CRYPTO",
  "RETIREMENT",
  "REAL_ESTATE",
  "OTHER_INVESTMENT",
];

export const BANK_ACCOUNT_TYPES: AccountType[] = [
  "CASH",
  "CHECKING",
  "CREDIT_CARD",
  "SAVINGS",
  "JOINT",
  "JOINT_SAVINGS",
  "LOAN",
  "OTHER",
];

export const INVESTMENT_ACCOUNT_TYPES: AccountType[] = [
  "BROKERAGE",
  "CRYPTO",
  "RETIREMENT",
  "REAL_ESTATE",
  "OTHER_INVESTMENT",
];

const TYPE_TO_ROLE: Record<AccountType, "CASH" | "INVESTMENT"> = {
  CHECKING: "CASH",
  SAVINGS: "CASH",
  CREDIT_CARD: "CASH",
  CASH: "CASH",
  INVESTMENTS: "INVESTMENT",
  LOAN: "CASH",
  OTHER: "CASH",
  JOINT: "CASH",
  JOINT_SAVINGS: "CASH",
  BROKERAGE: "INVESTMENT",
  CRYPTO: "INVESTMENT",
  RETIREMENT: "INVESTMENT",
  REAL_ESTATE: "INVESTMENT",
  OTHER_INVESTMENT: "INVESTMENT",
};

const TYPE_TO_DOMAIN: Record<AccountType, "CASHFLOW" | "INVESTING"> = {
  CHECKING: "CASHFLOW",
  SAVINGS: "CASHFLOW",
  CREDIT_CARD: "CASHFLOW",
  CASH: "CASHFLOW",
  INVESTMENTS: "INVESTING",
  LOAN: "CASHFLOW",
  OTHER: "CASHFLOW",
  JOINT: "CASHFLOW",
  JOINT_SAVINGS: "CASHFLOW",
  BROKERAGE: "INVESTING",
  CRYPTO: "INVESTING",
  RETIREMENT: "INVESTING",
  REAL_ESTATE: "INVESTING",
  OTHER_INVESTMENT: "INVESTING",
};

const TYPE_ICONS: Record<AccountType, LucideIcon> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CREDIT_CARD: CreditCard,
  CASH: Wallet,
  INVESTMENTS: TrendingUp,
  LOAN: HandCoins,
  OTHER: Building2,
  JOINT: Users,
  // Between joint and savings: savings icon, its own color (between navy and sky blue).
  JOINT_SAVINGS: PiggyBank,
  BROKERAGE: BarChart3,
  CRYPTO: Bitcoin,
  RETIREMENT: Shield,
  REAL_ESTATE: Home,
  OTHER_INVESTMENT: Layers,
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
    JOINT: "accountTypes.joint",
    JOINT_SAVINGS: "accountTypes.joint_savings",
    BROKERAGE: "accountTypes.brokerage",
    CRYPTO: "accountTypes.crypto",
    RETIREMENT: "accountTypes.retirement",
    REAL_ESTATE: "accountTypes.real_estate",
    OTHER_INVESTMENT: "accountTypes.other_investment",
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
    JOINT: "accountTypeDescriptions.joint",
    JOINT_SAVINGS: "accountTypeDescriptions.joint_savings",
    BROKERAGE: "accountTypeDescriptions.brokerage",
    CRYPTO: "accountTypeDescriptions.crypto",
    RETIREMENT: "accountTypeDescriptions.retirement",
    REAL_ESTATE: "accountTypeDescriptions.real_estate",
    OTHER_INVESTMENT: "accountTypeDescriptions.other_investment",
  };
  return keys[type];
}

/** Shared accounts carry a share of the balance (the user's %). */
export function isSharedType(type: AccountType | null | undefined): boolean {
  return type === "JOINT" || type === "JOINT_SAVINGS";
}

/** Savings accounts are kept out of spending analysis and the dashboard totals. */
export function isSavingsType(type: AccountType | null | undefined): boolean {
  return type === "SAVINGS" || type === "JOINT_SAVINGS";
}

/** The order accounts are listed in everywhere: checking, joint, joint savings, savings, then the rest. */
const DISPLAY_PRIORITY: Record<string, number> = {
  CHECKING: 0,
  CASH: 1, CREDIT_CARD: 1,
  JOINT: 2,
  JOINT_SAVINGS: 3,
  SAVINGS: 4,
  INVESTMENTS: 5, BROKERAGE: 5, CRYPTO: 5, RETIREMENT: 5, REAL_ESTATE: 5, OTHER_INVESTMENT: 5,
  LOAN: 6,
  OTHER: 7,
};

export function compareAccountsForDisplay(
  a: { account_type: string },
  b: { account_type: string },
): number {
  return (DISPLAY_PRIORITY[a.account_type] ?? 7) - (DISPLAY_PRIORITY[b.account_type] ?? 7);
}
