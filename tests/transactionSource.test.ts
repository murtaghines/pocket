import { describe, it, expect } from "vitest";
import {
  isManualTransaction,
  buildManualFingerprint,
} from "../src/lib/transactionSource";

describe("transactionSource", () => {
  it("mints content-based manual fingerprints (deterministic SHA-256)", async () => {
    const a = await buildManualFingerprint("2024-01-01", -10, "EUR", "Test");
    const b = await buildManualFingerprint("2024-01-01", -10, "EUR", "Test");
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs when any input differs", async () => {
    const base = await buildManualFingerprint("2024-01-01", -10, "EUR", "Mercadona");
    const diffDate = await buildManualFingerprint("2024-01-02", -10, "EUR", "Mercadona");
    const diffAmt = await buildManualFingerprint("2024-01-01", -11, "EUR", "Mercadona");
    const diffCur = await buildManualFingerprint("2024-01-01", -10, "USD", "Mercadona");
    const diffDesc = await buildManualFingerprint("2024-01-01", -10, "EUR", "Lidl");
    expect(base).not.toBe(diffDate);
    expect(base).not.toBe(diffAmt);
    expect(base).not.toBe(diffCur);
    expect(base).not.toBe(diffDesc);
  });

  it("treats a row without import_id as manual", () => {
    expect(isManualTransaction({ import_id: null })).toBe(true);
    expect(isManualTransaction({ import_id: undefined })).toBe(true);
    expect(isManualTransaction({})).toBe(true);
  });

  it("treats a row with import_id as imported", () => {
    expect(isManualTransaction({ import_id: "imp-1" })).toBe(false);
  });
});
