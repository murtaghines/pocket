import type { Account } from "@/hooks/useAccounts";

export function applySplit(
  amount: number,
  accountId: string | null | undefined,
  accounts: Account[],
): number {
  if (!accountId) return amount;
  const account = accounts.find((a) => a.id === accountId);
  if (!account || account.split_percentage === 100) return amount;
  return Math.round((amount * account.split_percentage) / 100 * 100) / 100;
}

export function buildSplitMap(accounts: Account[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const a of accounts) {
    if (a.split_percentage !== 100) map[a.id] = a.split_percentage;
  }
  return map;
}

export function applySplitFast(
  amount: number,
  accountId: string | null | undefined,
  splitMap: Record<string, number>,
): number {
  if (!accountId) return amount;
  const pct = splitMap[accountId];
  if (pct == null) return amount;
  return Math.round((amount * pct) / 100 * 100) / 100;
}
