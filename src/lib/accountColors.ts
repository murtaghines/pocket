import type { AccountType } from "@/lib/accountTypes";


/**
 * Single source of truth for how an account's bank + nickname combine into display
 * text (e.g. "Revolut · Personal"). If the nickname is blank or identical to the
 * bank, shows just the bank name — never a redundant "Revolut · Revolut".
 */
export function getAccountDisplayName(account: { institution: string; name: string }): string {
  const institution = account.institution?.trim() || "";
  const name = account.name?.trim() || "";
  if (!name || name.toLowerCase() === institution.toLowerCase()) return institution;
  return `${institution} · ${name}`;
}

/**
 * Each account type has one fixed color (blues, navies, grays). Users name their accounts, they don't
 * pick colors: the same type always looks the same everywhere. The icon chip uses this color at low
 * opacity as its background and the full color for the icon.
 */
export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  CHECKING: "#155fd6",
  SAVINGS: "#5b9bd5",
  JOINT: "#0a2a5e",
  JOINT_SAVINGS: "#326299",
  CASH: "#7a8499",
  CREDIT_CARD: "#3b4558",
  LOAN: "#9aa3b5",
  OTHER: "#b8c4d6",
  INVESTMENTS: "#2a4f86",
  BROKERAGE: "#4b7fc4",
  CRYPTO: "#6b7a99",
  RETIREMENT: "#1c3d6b",
  REAL_ESTATE: "#8ea3c2",
  OTHER_INVESTMENT: "#4a5568",
};

export function getAccountColor(account: { account_type: AccountType }): string {
  return ACCOUNT_TYPE_COLORS[account.account_type] ?? ACCOUNT_TYPE_COLORS.OTHER;
}

/** Background for an icon chip: the account color at low opacity (lighter than the icon). */
export function getAccountTint(color: string): string {
  return `${color}24`;
}
