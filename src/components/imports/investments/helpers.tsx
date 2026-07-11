import type { AuditEntry } from "./types";

/**
 * Fields the user can edit from the inline investments table — used to build audit
 * diffs. Mirrors cashflow/helpers.tsx USER_TRACKED_FIELDS, but investments has its own
 * field set (platform/asset_type/description/amount/date/type instead of
 * movement/category). Kept as its own copy rather than importing from cashflow/ — the
 * two import modules are deliberately kept independent (see .claude/rules/investments.md
 * and docs/epics/uploads.md "module boundary").
 */
export const USER_TRACKED_FIELDS = new Set<string>([
  "platform",
  "asset_type",
  "description",
  "amount",
  "date",
  "type",
  "is_hidden",
]);

export const FIELD_LABELS: Record<string, string> = {
  platform: "Platform",
  asset_type: "Asset type",
  description: "Description",
  amount: "Amount",
  date: "Date",
  type: "Type",
  is_hidden: "Visibility",
};

export function formatAuditValue(
  field: string,
  value: unknown,
  formatCurrency: (n: number) => string,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field === "amount" && typeof value === "number") return formatCurrency(value);
  if (field === "is_hidden") return value ? "Hidden" : "Visible";
  if (field === "type" && typeof value === "string") {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
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

/**
 * Walk the audit history (newest → oldest) and reconstruct the *original* pre-edit value
 * for every tracked field. Reverts are skipped, and we only keep the oldest `before` value
 * we encounter per field — by definition the import-time value. Mirrors
 * cashflow/helpers.tsx buildOriginalSnapshot.
 */
export function buildOriginalSnapshot(history: AuditEntry[]): {
  values: Record<string, unknown>;
  fields: string[];
} {
  const values: Record<string, unknown> = {};
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
 * True if every tracked field on the current row matches its original (pre-edit) value.
 * Used to drop the "edited" highlight once the user reverts all changes.
 */
export function isBackToOriginal(
  current: Record<string, unknown>,
  originalValues: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(originalValues)) {
    const orig = originalValues[key] ?? null;
    const curr = (current[key] ?? null) as unknown;
    const a = orig == null ? null : String(orig);
    const b = curr == null ? null : String(curr);
    if (a !== b) return false;
  }
  return true;
}
