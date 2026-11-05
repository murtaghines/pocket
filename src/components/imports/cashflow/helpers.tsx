import { Plus, Minus, ArrowRightLeft } from "lucide-react";
import type { PillTone } from "@/components/ui/pill-badge";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSFER_CATEGORIES,
  TRANSFER_OUTGOING,
  TRANSFER_INCOMING,
} from "@/lib/categoryTranslations";
import type { AuditEntry, MovementType } from "./types";

export const DEFAULT_MONTHS = 6;
export const MIN_MONTHS = 5;
export const MONTHS_INCREMENT = 1;
export const ROW_THRESHOLD = 50;

/** Fields the user can edit from the inline table — used to build audit diffs. */
export const USER_TRACKED_FIELDS = new Set<string>([
  "movement",
  "category",
  "category_id",
  "amount",
  "is_hidden",
  "description",
  "description_norm",
  "date",
  "account_id",
]);

/** Fields that "revert to original" restores — bank-statement data only.
 *  Category/movement are user classification choices and are NOT reverted. */
export const REVERTABLE_FIELDS = new Set<string>([
  "description",
  "description_norm",
  "date",
  "account_id",
  "amount",
]);

/** When a revert payload restores `amount` to its imported value, clear
 *  `amount_original` back to null — the row is no longer manually edited. */
export function withAmountOriginalReset(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  if ("amount" in payload) payload.amount_original = null;
  return payload;
}

export function filterRevertableSnapshot(
  snapshot: { values: Record<string, unknown>; fields: string[] },
): { values: Record<string, unknown>; fields: string[] } {
  const values: Record<string, unknown> = {};
  const fields: string[] = [];
  for (const f of snapshot.fields) {
    if (REVERTABLE_FIELDS.has(f)) {
      values[f] = snapshot.values[f];
      fields.push(f);
    }
  }
  return { values, fields };
}

const FIELD_LABEL_KEYS: Record<string, string> = {
  movement: "imports.fieldMovement",
  category: "imports.fieldCategory",
  category_id: "imports.fieldCategory",
  amount: "imports.fieldAmount",
  is_hidden: "imports.fieldVisibility",
  description: "imports.fieldDescription",
  description_norm: "imports.fieldDescription",
  date: "imports.fieldDate",
  account_id: "imports.fieldAccount",
};

export function getFieldLabel(field: string, t: (key: string) => string): string {
  const key = FIELD_LABEL_KEYS[field];
  return key ? t(key) : field;
}

/**
 * Walk the audit history (newest → oldest) and reconstruct the *original*
 * pre-edit value for every tracked field. Reverts are skipped — they don't
 * count as user-authored edits — and we only keep the oldest `before` value
 * we encounter for each field, which is by definition the import-time value.
 */
export function buildOriginalSnapshot(history: AuditEntry[]): {
  values: Record<string, unknown>;
  fields: string[];
} {
  const values: Record<string, unknown> = {};
  // history comes newest-first; iterate oldest-first so we overwrite with the
  // earliest known `before`, then ignore the field on subsequent (newer) edits.
  const ordered = [...history]
    .filter((h) => h.action !== "revert")
    .reverse();
  for (const entry of ordered) {
    const before = (entry.diff_json?.before || {}) as Record<string, unknown>;
    const fields = entry.diff_json?.fields || [];
    for (const f of fields) {
      if (!USER_TRACKED_FIELDS.has(f)) continue;
      if (!(f in values)) values[f] = before[f] ?? null;
    }
  }
  return { values, fields: Object.keys(values) };
}

/**
 * Returns true if every tracked field on the current transaction matches its
 * original (pre-edit) value. Used to hide the "edited" highlight after the
 * user reverts all their changes back to the imported state.
 */
export function isBackToOriginal(
  current: Record<string, unknown>,
  originalValues: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(originalValues)) {
    const orig = originalValues[key] ?? null;
    const curr = (current[key] ?? null) as unknown;
    // Loose equality: numbers/strings normalize, null/undefined treated equal
    const a = orig == null ? null : String(orig);
    const b = curr == null ? null : String(curr);
    if (a !== b) return false;
  }
  return true;
}

export const getMovementIcon = (m: MovementType) => {
  switch (m) {
    case "INCOME":
      return <Plus className="w-3 h-3" />;
    case "EXPENSE":
      return <Minus className="w-3 h-3" />;
    case "TRANSFER":
      return <ArrowRightLeft className="w-3 h-3" />;
    default:
      return null;
  }
};
export const getMovementTone = (m: MovementType): PillTone => {
  switch (m) {
    case "INCOME":
      return "green";
    case "EXPENSE":
      return "red";
    case "TRANSFER":
      return "neutral";
    default:
      return "neutral";
  }
};
export const getCategoriesForMovement = (m: MovementType, amount?: number): string[] => {
  switch (m) {
    case "INCOME":
      return INCOME_CATEGORIES;
    case "TRANSFER":
      if (amount === undefined || amount === 0) return TRANSFER_CATEGORIES;
      return amount < 0 ? TRANSFER_OUTGOING : TRANSFER_INCOMING;
    default:
      return EXPENSE_CATEGORIES;
  }
};

export function formatAuditValue(
  field: string,
  value: unknown,
  formatCurrency: (n: number) => string,
  getCategoryLabel: (slug: string) => string,
  getMovementLabel?: (m: string) => string,
  t?: (key: string) => string,
): string {
  if (value === null || value === undefined) return "—";
  if (field === "amount" && typeof value === "number") return formatCurrency(value);
  if ((field === "category" || field === "category_id") && typeof value === "string") {
    return getCategoryLabel(value) || value;
  }
  if (field === "movement" && typeof value === "string") return getMovementLabel?.(value) ?? value;
  if (field === "is_hidden") return value ? (t?.("imports.hidden") ?? "Hidden") : (t?.("imports.visible") ?? "Visible");
  return String(value);
}

export function formatRelativeTime(iso: string, t?: (key: string, opts?: Record<string, unknown>) => string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return t?.("imports.justNow") ?? "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return t?.("imports.minutesAgo", { count: min }) ?? `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return t?.("imports.hoursAgo", { count: hr }) ?? `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return t?.("imports.daysAgo", { count: days }) ?? `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
