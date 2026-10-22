/**
 * User-controlled display formats for numbers, money and dates. Everything is optional: an unset
 * field means "follow the locale of the user's country", so an empty `DisplayFormat` reproduces the
 * plain Intl output exactly. Pure functions only (no React) so they can be unit tested.
 */

export type DecimalSeparator = "." | ",";
export type GroupSeparator = "." | "," | " " | "'" | "";
export type DateSeparator = "/" | "-" | ".";

// A type alias (not an interface) so it is assignable to the database's Json column type.
export type DisplayFormat = {
  decimal?: DecimalSeparator;
  group?: GroupSeparator;
  currencyPosition?: "before" | "after";
  /** Space between the currency and the amount. */
  currencySpace?: boolean;
  currencyDisplay?: "symbol" | "code";
  dateSeparator?: DateSeparator;
  /** "numeric" = 28/02/2026, "short" = 28 Feb 2026. */
  dateStyle?: "numeric" | "short";
  timeFormat?: "24h" | "12h";
};

const DECIMALS = [".", ","] as const;
const GROUPS = [".", ",", " ", "'", ""] as const;
const DATE_SEPARATORS = ["/", "-", "."] as const;

/** Narrow whatever came out of the database into a valid DisplayFormat (unknown values are dropped). */
export function sanitizeDisplayFormat(raw: unknown): DisplayFormat {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const out: DisplayFormat = {};
  if (DECIMALS.includes(r.decimal as DecimalSeparator)) out.decimal = r.decimal as DecimalSeparator;
  if (GROUPS.includes(r.group as GroupSeparator)) out.group = r.group as GroupSeparator;
  if (r.currencyPosition === "before" || r.currencyPosition === "after") out.currencyPosition = r.currencyPosition;
  if (typeof r.currencySpace === "boolean") out.currencySpace = r.currencySpace;
  if (r.currencyDisplay === "symbol" || r.currencyDisplay === "code") out.currencyDisplay = r.currencyDisplay;
  if (DATE_SEPARATORS.includes(r.dateSeparator as DateSeparator)) out.dateSeparator = r.dateSeparator as DateSeparator;
  if (r.dateStyle === "numeric" || r.dateStyle === "short") out.dateStyle = r.dateStyle;
  if (r.timeFormat === "24h" || r.timeFormat === "12h") out.timeFormat = r.timeFormat;
  // The decimal and thousands separators can never be the same character.
  if (out.decimal && out.group && out.decimal === out.group) delete out.group;
  return out;
}

/** Drop unset keys so what we store stays small (and `{}` means "all automatic"). */
export function compactDisplayFormat(f: DisplayFormat): DisplayFormat {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as DisplayFormat;
}

export function hasNumberOverrides(f: DisplayFormat): boolean {
  return f.decimal !== undefined || f.group !== undefined || f.currencyPosition !== undefined
    || f.currencySpace !== undefined || f.currencyDisplay !== undefined;
}

export function hasDateOverrides(f: DisplayFormat): boolean {
  return f.dateSeparator !== undefined || f.dateStyle !== undefined || f.timeFormat !== undefined;
}

function localeSeparators(locale: string): { decimal: string; group: string } {
  const parts = new Intl.NumberFormat(locale, { useGrouping: "always" as unknown as boolean, minimumFractionDigits: 2 }).formatToParts(1234567.89);
  return {
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    group: parts.find((p) => p.type === "group")?.value ?? ",",
  };
}

function resolveSeparators(locale: string, f: DisplayFormat): { decimal: string; group: string | undefined } {
  const auto = localeSeparators(locale);
  const decimal = f.decimal ?? auto.decimal;
  if (f.group !== undefined) return { decimal, group: f.group };
  // Following the locale for grouping: avoid colliding with an overridden decimal mark.
  if (auto.group === decimal) return { decimal, group: decimal === "." ? "," : "." };
  return { decimal, group: undefined };
}

function remapSeparators(parts: Intl.NumberFormatPart[], locale: string, f: DisplayFormat): Intl.NumberFormatPart[] {
  const { decimal, group } = resolveSeparators(locale, f);
  return parts.map((p) => {
    if (p.type === "decimal") return { ...p, value: decimal };
    if (p.type === "group" && group !== undefined) return { ...p, value: group };
    return p;
  });
}

/** Plain numbers and percentages: only the separators can be customised. */
export function formatNumberWithFormat(
  value: number,
  locale: string,
  options: Intl.NumberFormatOptions,
  f: DisplayFormat,
): string {
  const parts = new Intl.NumberFormat(locale, options).formatToParts(value);
  if (f.decimal === undefined && f.group === undefined) return parts.map((p) => p.value).join("");
  return remapSeparators(parts, locale, f).map((p) => p.value).join("");
}

const NBSP = " ";

/** Money: separators, symbol/code, position and spacing. `options` are the Intl currency options. */
export function formatMoneyWithFormat(
  amount: number,
  locale: string,
  currency: string,
  options: Intl.NumberFormatOptions,
  f: DisplayFormat,
): string {
  const parts = new Intl.NumberFormat(locale, { ...options, style: "currency", currency }).formatToParts(amount);
  const currencyIdx = parts.findIndex((p) => p.type === "currency");
  const firstDigitIdx = parts.findIndex((p) => p.type === "integer");
  const autoPosition = currencyIdx >= 0 && currencyIdx < firstDigitIdx ? "before" : "after";
  const autoSpace = parts.some((p) => p.type === "literal" && /\s/.test(p.value));

  const sign = parts.filter((p) => p.type === "minusSign" || p.type === "plusSign").map((p) => (p.type === "minusSign" ? "-" : "+")).join("");
  const numberText = remapSeparators(
    parts.filter((p) => ["integer", "group", "decimal", "fraction", "compact"].includes(p.type)),
    locale,
    f,
  ).map((p) => p.value).join("");
  const symbol = f.currencyDisplay === "code" ? currency : (parts[currencyIdx]?.value ?? currency);
  const position = f.currencyPosition ?? autoPosition;
  // Keep the locale's spacing while the symbol stays where the locale puts it ("R$ 10", "$10", "10 €");
  // once the user moves it, fall back to the common convention: tight before, spaced after.
  const defaultSpace = position === autoPosition ? autoSpace : position === "after";
  const space = (f.currencySpace ?? defaultSpace) ? NBSP : "";

  return sign + (position === "before" ? `${symbol}${space}${numberText}` : `${numberText}${space}${symbol}`);
}

/* ------------------------------ dates ------------------------------ */

export type DateOrder = "DMY" | "MDY" | "YMD";

function defaultSeparator(order: DateOrder): DateSeparator {
  return order === "YMD" ? "-" : "/";
}

export function buildFullDatePattern(order: DateOrder, f: DisplayFormat): string {
  if (f.dateStyle === "short") return order === "MDY" ? "MMM d, yyyy" : order === "YMD" ? "yyyy MMM d" : "d MMM yyyy";
  const s = f.dateSeparator ?? defaultSeparator(order);
  return order === "MDY" ? `MM${s}dd${s}yyyy` : order === "YMD" ? `yyyy${s}MM${s}dd` : `dd${s}MM${s}yyyy`;
}

/** Day + month, no year. */
export function buildShortDatePattern(order: DateOrder, f: DisplayFormat): string {
  if (f.dateStyle === "short") return order === "DMY" ? "d MMM" : "MMM d";
  const s = f.dateSeparator ?? defaultSeparator(order);
  return order === "DMY" ? `dd${s}MM` : `MM${s}dd`;
}

export function resolveTimeFormat(locale: string, f: DisplayFormat): "24h" | "12h" {
  if (f.timeFormat) return f.timeFormat;
  const cycle = (new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions() as { hourCycle?: string }).hourCycle;
  return cycle === "h11" || cycle === "h12" ? "12h" : "24h";
}

export function buildDateTimePattern(order: DateOrder, locale: string, f: DisplayFormat): string {
  const time = resolveTimeFormat(locale, f) === "12h" ? "h:mm a" : "HH:mm";
  return `${buildFullDatePattern(order, f)}, ${time}`;
}
