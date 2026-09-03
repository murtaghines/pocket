import { Plus, Minus, ArrowRightLeft } from "lucide-react";
import type { PillTone } from "@/components/ui/pill-badge";
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  TRANSFER_CATEGORIES,
  getMovementLabel,
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
  "description_norm",
  "date",
  "account_id",
]);

export const FIELD_LABELS: Record<string, string> = {
  movement: "Movement",
  category: "Category",
  category_id: "Category",
  amount: "Amount",
  is_hidden: "Visibility",
  description_norm: "Description",
  date: "Date",
  account_id: "Account",
};

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

interface AuditEntry {
  id: string;
  entity_id: string;
  action: string;
  created_at: string;
  diff_json: {
    fields?: string[];
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
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
export const getCategoriesForMovement = (m: MovementType) => {
  switch (m) {
    case "INCOME":
      return INCOME_CATEGORIES;
    case "TRANSFER":
      return TRANSFER_CATEGORIES;
    default:
      return EXPENSE_CATEGORIES;
  }
};

export function formatAuditValue(
  field: string,
  value: unknown,
  formatCurrency: (n: number) => string,
  getCategoryLabel: (slug: string) => string,
): string {
  if (value === null || value === undefined) return "—";
  if (field === "amount" && typeof value === "number") return formatCurrency(value);
  if ((field === "category" || field === "category_id") && typeof value === "string") {
    return getCategoryLabel(value) || value;
  }
  if (field === "movement" && typeof value === "string") return getMovementLabel(value as MovementType);
  if (field === "is_hidden") return value ? "Hidden" : "Visible";
  return String(value);
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return "just now";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.round(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
