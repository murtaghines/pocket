import { describe, it, expect } from "vitest";
import { tryDeterministicParse } from "../supabase/functions/_shared/csvParser";

// ─── Helper ──────────────────────────────────────────────────────────────────

function dates(result: ReturnType<typeof tryDeterministicParse>) {
  return result!.transactions.map((t) => t.posted_date);
}

function amounts(result: ReturnType<typeof tryDeterministicParse>) {
  return result!.transactions.map((t) => t.amount_signed);
}

// ─── Basic comma-separated CSV (N26 / Revolut style) ──────────────────────────

describe("basic comma CSV (ISO dates, dot decimal)", () => {
  const csv = `Date,Description,Amount,Balance,Currency
2024-12-15,MERCADONA,-87.43,1234.56,EUR
2024-12-14,NOMINA DICIEMBRE,2850.00,3084.56,EUR
2024-12-13,SPOTIFY,-9.99,3074.57,EUR`;

  it("parses all rows", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.transactions).toHaveLength(3);
  });

  it("extracts dates correctly", () => {
    expect(dates(tryDeterministicParse(csv))).toEqual([
      "2024-12-15", "2024-12-14", "2024-12-13",
    ]);
  });

  it("extracts amounts with correct sign", () => {
    expect(amounts(tryDeterministicParse(csv))).toEqual([-87.43, 2850, -9.99]);
  });

  it("extracts balance", () => {
    const r = tryDeterministicParse(csv)!;
    expect(r.transactions[0].running_balance).toBe(1234.56);
  });

  it("extracts currency", () => {
    const r = tryDeterministicParse(csv)!;
    expect(r.transactions[0].currency).toBe("EUR");
  });

  it("detects comma delimiter", () => {
    expect(tryDeterministicParse(csv)!.delimiter).toBe(",");
  });
});

// ─── Semicolon-separated (Santander ES style) ────────────────────────────────

describe("semicolon CSV (DD/MM/YYYY, comma decimal)", () => {
  const csv = `Fecha;Concepto;Importe;Saldo
15/12/2024;COMPRA TARJETA MERCADONA;-87,43;1.234,56
14/12/2024;NOMINA DICIEMBRE;2.850,00;3.084,56
13/12/2024;RECIBO SPOTIFY;-9,99;3.074,57`;

  it("parses all rows", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.transactions).toHaveLength(3);
  });

  it("parses DD/MM/YYYY dates", () => {
    expect(dates(tryDeterministicParse(csv))).toEqual([
      "2024-12-15", "2024-12-14", "2024-12-13",
    ]);
  });

  it("parses European amounts (comma decimal, dot thousands)", () => {
    expect(amounts(tryDeterministicParse(csv))).toEqual([-87.43, 2850, -9.99]);
  });

  it("parses European balance", () => {
    const r = tryDeterministicParse(csv)!;
    expect(r.transactions[0].running_balance).toBe(1234.56);
    expect(r.transactions[1].running_balance).toBe(3084.56);
  });

  it("detects semicolon delimiter", () => {
    expect(tryDeterministicParse(csv)!.delimiter).toBe(";");
  });
});

// ─── Dual debit/credit columns (CaixaBank style) ────────────────────────────

describe("dual debit/credit columns", () => {
  const csv = `Date\tDescription\tDebit\tCredit\tBalance
15/12/2024\tCOMPRA MERCADONA\t87,43\t\t1.234,56
14/12/2024\tNOMINA\t\t2.850,00\t3.084,56
13/12/2024\tRECIBO SPOTIFY\t9,99\t\t3.074,57`;

  it("parses debit as negative, credit as positive", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(amounts(r)).toEqual([-87.43, 2850, -9.99]);
  });

  it("detects tab delimiter", () => {
    expect(tryDeterministicParse(csv)!.delimiter).toBe("\t");
  });
});

// ─── MM/DD/YYYY format (US Chase style) ─────────────────────────────────────

describe("MM/DD/YYYY dates (US format)", () => {
  const csv = `Transaction Date,Description,Amount,Balance
12/15/2024,TARGET STORE,-42.99,1500.00
01/05/2025,PAYROLL DEPOSIT,3200.00,4700.00
12/31/2024,NETFLIX,-15.99,4684.01`;

  it("detects MDY when month > 12 impossible for day field", () => {
    // 12/15 → the 15 can't be a month, so first field is month
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(dates(r)).toEqual(["2024-12-15", "2025-01-05", "2024-12-31"]);
  });
});

// ─── Metadata rows before header ────────────────────────────────────────────

describe("metadata rows before header", () => {
  const csv = `Bank Statement Export
Account: ES12 3456 7890
Period: December 2024

Date,Description,Amount,Balance
2024-12-15,MERCADONA,-87.43,1234.56
2024-12-14,NOMINA,2850.00,3084.56`;

  it("finds header on row 4 (after metadata)", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    // Blank line is filtered, so header is at index 3 in non-empty lines
    expect(r!.headerRow).toBe(3);
    expect(r!.transactions).toHaveLength(2);
  });
});

// ─── German format (dot-separated date, comma decimal) ──────────────────────

describe("German format (DD.MM.YYYY)", () => {
  const csv = `Buchungstag;Bezeichnung;Betrag;Kontostand
15.12.2024;REWE SAGT DANKE;-23,45;1.456,78
14.12.2024;GEHALT DEZEMBER;3.200,00;4.656,78`;

  it("parses DD.MM.YYYY dates", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(dates(r)).toEqual(["2024-12-15", "2024-12-14"]);
  });

  it("parses German amounts", () => {
    expect(amounts(tryDeterministicParse(csv))).toEqual([-23.45, 3200]);
  });
});

// ─── BOM handling ───────────────────────────────────────────────────────────

describe("BOM and encoding", () => {
  it("strips UTF-8 BOM", () => {
    const csv = String.fromCharCode(0xFEFF) + `Date,Description,Amount
2024-12-15,MERCADONA,-87.43
2024-12-14,NOMINA,2850.00`;

    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.transactions).toHaveLength(2);
  });
});

// ─── Quoted fields with commas ──────────────────────────────────────────────

describe("quoted fields with commas", () => {
  const csv = `Date,Description,Amount,Balance
2024-12-15,"COMPRA EN MERCADONA, S.A.",-87.43,1234.56
2024-12-14,"NOMINA EMPRESA, SL",2850.00,3084.56`;

  it("handles commas inside quoted fields", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.transactions[0].description_raw).toBe("COMPRA EN MERCADONA, S.A.");
    expect(r!.transactions[1].description_raw).toBe("NOMINA EMPRESA, SL");
  });
});

// ─── Parenthesized negatives ────────────────────────────────────────────────

describe("parenthesized negatives", () => {
  const csv = `Date,Description,Amount,Balance
2024-12-15,MERCADONA,(87.43),1234.56
2024-12-14,REFUND,50.00,1284.56`;

  it("parses (amount) as negative", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.transactions[0].amount_signed).toBe(-87.43);
    expect(r!.transactions[1].amount_signed).toBe(50);
  });
});

// ─── Returns null for unparseable content ───────────────────────────────────

describe("returns null for unparseable content", () => {
  it("returns null for plain text (no CSV structure)", () => {
    expect(tryDeterministicParse("Hello world this is not a CSV")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(tryDeterministicParse("")).toBeNull();
  });

  it("returns null when no recognizable headers", () => {
    const csv = `Col1,Col2,Col3
foo,bar,baz
qux,quux,corge`;
    expect(tryDeterministicParse(csv)).toBeNull();
  });

  it("returns null for header-only (no data rows)", () => {
    expect(tryDeterministicParse("Date,Description,Amount")).toBeNull();
  });
});

// ─── Low parse rate triggers bail ──────────────────────────────────────────

describe("parse rate threshold", () => {
  it("returns null when < 80% of rows parse", () => {
    const csv = `Date,Description,Amount
2024-12-15,MERCADONA,-87.43
not a date,foo,bar
nope,baz,qux
also bad,x,y
no good,z,w`;
    // 1 out of 5 = 20% — should bail
    expect(tryDeterministicParse(csv)).toBeNull();
  });
});

// ─── Revolut-style CSV ──────────────────────────────────────────────────────

describe("Revolut CSV", () => {
  const csv = `Completed Date,Description,Paid Out,Paid In,Balance
15/12/2024,MERCADONA,87.43,,1234.56
14/12/2024,SALARY,,2850.00,3084.56
13/12/2024,SPOTIFY,9.99,,3074.57`;

  it("maps Paid Out/Paid In as debit/credit", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(amounts(r)).toEqual([-87.43, 2850, -9.99]);
  });
});

// ─── Pipe-delimited ─────────────────────────────────────────────────────────

describe("pipe-delimited CSV", () => {
  const csv = `Date|Description|Amount|Balance
2024-12-15|MERCADONA|-87.43|1234.56
2024-12-14|NOMINA|2850.00|3084.56`;

  it("detects pipe delimiter", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.delimiter).toBe("|");
    expect(r!.transactions).toHaveLength(2);
  });
});

// ─── Two-digit year ─────────────────────────────────────────────────────────

describe("two-digit year", () => {
  const csv = `Date,Description,Amount
15/12/24,MERCADONA,-87.43
14/12/24,NOMINA,2850.00`;

  it("converts 2-digit year (24 → 2024)", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(dates(r)).toEqual(["2024-12-15", "2024-12-14"]);
  });
});

// ─── Currency symbols in amount field ────────────────────────────────────────

describe("currency symbols in amount", () => {
  const csv = `Date,Description,Amount,Balance
2024-12-15,MERCADONA,€-87.43,€1234.56
2024-12-14,NOMINA,€2850.00,€3084.56`;

  it("strips currency symbols from amounts", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(amounts(r)).toEqual([-87.43, 2850]);
  });
});

// ─── Carriage return line endings ────────────────────────────────────────────

describe("Windows line endings (CRLF)", () => {
  const csv = "Date,Description,Amount\r\n2024-12-15,MERCADONA,-87.43\r\n2024-12-14,NOMINA,2850.00\r\n";

  it("handles CRLF", () => {
    const r = tryDeterministicParse(csv);
    expect(r).not.toBeNull();
    expect(r!.transactions).toHaveLength(2);
  });
});
