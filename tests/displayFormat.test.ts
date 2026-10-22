import { describe, it, expect } from "vitest";
import {
  sanitizeDisplayFormat,
  formatMoneyWithFormat,
  formatNumberWithFormat,
  buildFullDatePattern,
  buildShortDatePattern,
  buildDateTimePattern,
} from "../src/lib/displayFormat";

const OPTS = { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: "always" as unknown as boolean };
const money = (n: number, locale: string, cur: string, f = {}, o: Intl.NumberFormatOptions = OPTS) =>
  formatMoneyWithFormat(n, locale, cur, o, f).replace(/\s/g, " ");

describe("formatMoneyWithFormat", () => {
  it("matches plain Intl when nothing is overridden", () => {
    const plain = new Intl.NumberFormat("es-ES", { ...OPTS, style: "currency", currency: "EUR" }).format(-1234567.89);
    expect(formatMoneyWithFormat(-1234567.89, "es-ES", "EUR", OPTS, {})).toBe(plain);
    const us = new Intl.NumberFormat("en-US", { ...OPTS, style: "currency", currency: "USD" }).format(1234.5);
    expect(formatMoneyWithFormat(1234.5, "en-US", "USD", OPTS, {})).toBe(us);
  });

  it("changes separators", () => {
    expect(money(1234567.89, "es-ES", "EUR", { decimal: ".", group: "," })).toBe("1,234,567.89 €");
    expect(money(1234567.89, "en-US", "USD", { decimal: ",", group: "." })).toBe("$1.234.567,89");
    expect(money(1234567.89, "en-US", "USD", { group: " " })).toBe("$1 234 567.89");
    expect(money(1234567.89, "en-US", "USD", { group: "'" })).toBe("$1'234'567.89");
    expect(money(1234567.89, "en-US", "USD", { group: "" })).toBe("$1234567.89");
  });

  it("never lets the thousands mark collide with an overridden decimal mark", () => {
    // es-ES groups with "." — switching the decimal to "." must move the grouping to ","
    expect(money(1234.5, "es-ES", "EUR", { decimal: "." })).toBe("1,234.50 €");
    expect(money(1234.5, "en-US", "USD", { decimal: "," })).toBe("$1.234,50");
  });

  it("moves and spaces the currency", () => {
    expect(money(1234.5, "es-ES", "EUR", { currencyPosition: "before" })).toBe("€1.234,50");
    expect(money(1234.5, "es-ES", "EUR", { currencyPosition: "before", currencySpace: true })).toBe("€ 1.234,50");
    expect(money(1234.5, "en-US", "USD", { currencyPosition: "after" })).toBe("1,234.50 $");
    expect(money(1234.5, "en-US", "USD", { currencyPosition: "after", currencySpace: false })).toBe("1,234.50$");
    expect(money(1234.5, "pt-BR", "BRL", {})).toBe("R$ 1.234,50");
    expect(money(1234.5, "es-ES", "EUR", { currencySpace: false })).toBe("1.234,50€");
  });

  it("shows the currency code instead of the symbol", () => {
    expect(money(1234.5, "es-ES", "EUR", { currencyDisplay: "code" })).toBe("1.234,50 EUR");
    expect(money(1234.5, "en-US", "USD", { currencyDisplay: "code", currencySpace: true })).toBe("USD 1,234.50");
  });

  it("keeps signs and zero decimals", () => {
    expect(money(-1234.5, "en-US", "USD", { currencyPosition: "after", currencySpace: false })).toBe("-1,234.50$");
    expect(money(1235, "es-ES", "EUR", { decimal: "." }, { ...OPTS, minimumFractionDigits: 0, maximumFractionDigits: 0 })).toBe("1,235 €");
    expect(money(5, "en-US", "USD", {}, { ...OPTS, signDisplay: "exceptZero" })).toBe("+$5.00");
  });

  it("handles compact notation", () => {
    expect(money(1500, "en-US", "USD", { decimal: "," }, { notation: "compact", maximumFractionDigits: 1 })).toBe("$1,5K");
  });
});

describe("formatNumberWithFormat", () => {
  it("only remaps separators", () => {
    expect(formatNumberWithFormat(1234567.891, "en-US", { maximumFractionDigits: 2 }, { decimal: ",", group: "." })).toBe("1.234.567,89");
    expect(formatNumberWithFormat(12.34, "en-US", { style: "percent", minimumFractionDigits: 1 }, { decimal: "," })).toBe("1.234,0%");
    expect(formatNumberWithFormat(1234.5, "en-US", { maximumFractionDigits: 2 }, {})).toBe("1,234.5");
  });
});

describe("date patterns", () => {
  it("defaults to the historical patterns", () => {
    expect(buildFullDatePattern("DMY", {})).toBe("dd/MM/yyyy");
    expect(buildFullDatePattern("MDY", {})).toBe("MM/dd/yyyy");
    expect(buildFullDatePattern("YMD", {})).toBe("yyyy-MM-dd");
    expect(buildShortDatePattern("DMY", {})).toBe("dd/MM");
    expect(buildShortDatePattern("YMD", {})).toBe("MM-dd");
  });

  it("applies separator and short-month style", () => {
    expect(buildFullDatePattern("DMY", { dateSeparator: "." })).toBe("dd.MM.yyyy");
    expect(buildFullDatePattern("YMD", { dateSeparator: "/" })).toBe("yyyy/MM/dd");
    expect(buildFullDatePattern("DMY", { dateStyle: "short" })).toBe("d MMM yyyy");
    expect(buildFullDatePattern("MDY", { dateStyle: "short" })).toBe("MMM d, yyyy");
    expect(buildShortDatePattern("MDY", { dateStyle: "short" })).toBe("MMM d");
  });

  it("builds date-time patterns with the chosen clock", () => {
    expect(buildDateTimePattern("DMY", "en-US", { timeFormat: "24h" })).toBe("dd/MM/yyyy, HH:mm");
    expect(buildDateTimePattern("MDY", "es-ES", { timeFormat: "12h" })).toBe("MM/dd/yyyy, h:mm a");
  });
});

describe("sanitizeDisplayFormat", () => {
  it("drops unknown values and collisions", () => {
    expect(sanitizeDisplayFormat(null)).toEqual({});
    expect(sanitizeDisplayFormat({ decimal: ";", group: "x", currencyPosition: "left" })).toEqual({});
    expect(sanitizeDisplayFormat({ decimal: ",", group: "," })).toEqual({ decimal: "," });
    expect(sanitizeDisplayFormat({ decimal: ",", group: "", currencySpace: false, dateSeparator: "-", timeFormat: "12h" }))
      .toEqual({ decimal: ",", group: "", currencySpace: false, dateSeparator: "-", timeFormat: "12h" });
  });
});
