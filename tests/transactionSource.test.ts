import { describe, it, expect } from "vitest";
import {
  isManualTransaction,
  buildManualFingerprint,
  MANUAL_FINGERPRINT_PREFIX,
} from "../src/lib/transactionSource";

describe("transactionSource", () => {
  it("mints manual fingerprints that are unique and prefixed", () => {
    const a = buildManualFingerprint("user-1");
    const b = buildManualFingerprint("user-1");
    expect(a.startsWith(MANUAL_FINGERPRINT_PREFIX)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("treats a minted fingerprint as manual", () => {
    expect(isManualTransaction({ fingerprint: buildManualFingerprint("u"), import_id: null })).toBe(true);
  });

  it("treats a content sha256 as imported", () => {
    expect(isManualTransaction({ fingerprint: "9f2ab7c4deadbeef", import_id: "imp-1" })).toBe(false);
  });

  // The regression this module exists for: manual entries added to a month that
  // already had a statement used to be stamped with that statement's import_id.
  // They must still read as manual, or the UI locks them and "delete file"
  // takes them down with the statement.
  it("still reads as manual when wrongly stamped with an import_id", () => {
    expect(
      isManualTransaction({ fingerprint: "manual-user-1-123-abcd", import_id: "imp-1" }),
    ).toBe(true);
  });

  it("falls back to the import link when no fingerprint was selected", () => {
    expect(isManualTransaction({ import_id: null })).toBe(true);
    expect(isManualTransaction({ import_id: "imp-1" })).toBe(false);
  });
});
