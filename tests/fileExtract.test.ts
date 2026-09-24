import { describe, it, expect } from "vitest";
import { reconstructDocument, type PdfTextItem } from "../src/lib/pdfTable";

// Helper: build a text item at (x, y). Higher y = higher on the page.
const T = (str: string, x: number, y: number): PdfTextItem => ({ str, x, y });

// A realistic Revolut two-column savings page, modeled on the actual pdfjs coordinates:
//  - a "Balance summary" block ABOVE the transaction table (must be dropped)
//  - a header whose "Money out" label wraps onto two lines ("Money"@468 / "out"@484)
//  - Money in ~x408-422, Money out ~x464-484, Balance ~x510-518
//  - interest/withdrawal descriptions that wrap ABOVE and BELOW the date row
//  - a legal footer (must be dropped)
function twoColumnPage(): PdfTextItem[] {
  return [
    // Balance summary block (above the header — not transactions)
    T("Balance summary", 44, 760),
    T("Opening Balance", 45, 755), T("€3,308.20", 274, 755),
    T("Closing Balance", 45, 750), T("€2,071.32", 274, 750),
    T("Total Withdrawal", 45, 745), T("€5,244.27", 274, 745),
    // Header (with wrapped "Money out")
    T("Money", 468, 712),
    T("Transaction/Value Date", 45, 708), T("Description", 151, 708),
    T("AER", 327, 708), T("NIR", 377, 708), T("Money in", 408, 708), T("Balance", 518, 708),
    T("out", 484, 704),
    // Tx1 — interest, description wraps above + below the data row
    T("Net Interest Paid to 'Instant Access", 151, 698),
    T("Jun 1, 2026", 45, 694), T("2.02%", 327, 694), T("2.00%", 367, 694), T("€0.13", 422, 694), T("€3,308.33", 510, 694),
    T("Savings' for Jun 1, 2026", 151, 690),
    // Tx2 — withdrawal (amount in the Money out column → negative)
    T("Withdrawal from 'Instant Access", 151, 684),
    T("Jun 15, 2026", 45, 680), T("€20.00", 469, 680), T("€3,341.03", 510, 680),
    T("Savings'", 151, 676),
    // Tx3 — deposit on a single row (amount in Money in → positive)
    T("Jun 15, 2026", 45, 670), T("Deposit to 'Savings Challenge'", 151, 670), T("€50.00", 416, 670), T("€3,291.03", 510, 670),
    // Legal footer (not a transaction)
    T("Revolut Bank UAB is licensed and regulated by the Bank of Lithuania.", 49, 40),
  ];
}

describe("reconstructDocument — two-column statements", () => {
  const out = reconstructDocument([twoColumnPage()]);

  it("signs Money-out amounts negative and Money-in amounts positive", () => {
    expect(out).toContain("-€20.00"); // withdrawal
    expect(out).toContain("+€0.13"); // interest (money in)
    expect(out).toContain("+€50.00"); // deposit (money in)
    expect(out).not.toContain("-€50.00");
    expect(out).not.toContain("-€0.13");
  });

  it("merges descriptions that wrap above and below the data row", () => {
    expect(out).toContain("Net Interest Paid to 'Instant Access Savings' for Jun 1, 2026");
    expect(out).toContain("Withdrawal from 'Instant Access Savings'");
  });

  it("keeps the running balance and the transaction date", () => {
    expect(out).toContain("bal €3,341.03");
    expect(out).toContain("Jun 15, 2026");
  });

  it("drops the Balance-summary block and the legal footer", () => {
    expect(out).not.toContain("Opening Balance");
    expect(out).not.toContain("Closing Balance");
    expect(out).not.toContain("Total Withdrawal");
    expect(out).not.toMatch(/Revolut Bank UAB/);
  });

  it("emits exactly one line per transaction (3 rows)", () => {
    const lines = out.split("\n").filter((l) => /^\w.*\|/.test(l));
    expect(lines).toHaveLength(3);
  });
});

describe("reconstructDocument — fallback to flat join", () => {
  it("leaves a single-amount-column statement as the flat join (no reconstruction)", () => {
    const page: PdfTextItem[] = [
      T("Date", 45, 700), T("Description", 151, 700), T("Amount", 400, 700), T("Balance", 500, 700),
      T("01/07/2026", 45, 690), T("MERCADONA", 151, 690), T("-87.43", 400, 690), T("1234.56", 500, 690),
    ];
    const flat = page.map((i) => i.str).filter(Boolean).join(" ");
    expect(reconstructDocument([page])).toBe(`--- Page 1 ---\n${flat}`);
  });

  it("leaves non-tabular text as the flat join", () => {
    const page: PdfTextItem[] = [
      T("Some bank statement", 40, 700),
      T("no columns here", 40, 690),
      T("just prose", 40, 680),
    ];
    const flat = page.map((i) => i.str).filter(Boolean).join(" ");
    expect(reconstructDocument([page])).toBe(`--- Page 1 ---\n${flat}`);
  });
});
