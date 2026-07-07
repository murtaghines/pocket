import { describe, it, expect } from "vitest";
import { evalArithmetic } from "../src/lib/safeMath";

// Safe replacement for the amount-editor's old Function() eval. Covers the shapes a user
// types into the amount cell plus the malformed inputs that must be rejected (not silently
// mis-parsed or executed).

describe("evalArithmetic — valid expressions", () => {
  it("parses plain numbers, including decimals and signs", () => {
    expect(evalArithmetic("50")).toBe(50);
    expect(evalArithmetic("3.5")).toBe(3.5);
    expect(evalArithmetic("-12")).toBe(-12);
  });

  it("evaluates the four operators with correct precedence", () => {
    expect(evalArithmetic("50*2")).toBe(100);
    expect(evalArithmetic("2+3*4")).toBe(14);
    expect(evalArithmetic("10/4")).toBe(2.5);
    expect(evalArithmetic("100-1-1")).toBe(98);
  });

  it("respects parentheses and unary minus", () => {
    expect(evalArithmetic("(2+3)*4")).toBe(20);
    expect(evalArithmetic("-(5)")).toBe(-5);
    expect(evalArithmetic("3*-2")).toBe(-6);
  });

  it("ignores surrounding whitespace", () => {
    expect(evalArithmetic("  12 + 8 ")).toBe(20);
  });
});

describe("evalArithmetic — rejected input returns null", () => {
  it("rejects empty / non-arithmetic / trailing garbage", () => {
    expect(evalArithmetic("")).toBeNull();
    expect(evalArithmetic("abc")).toBeNull();
    expect(evalArithmetic("2+")).toBeNull();
    expect(evalArithmetic("2**3")).toBeNull();
    expect(evalArithmetic("(2+3")).toBeNull();
    expect(evalArithmetic("1.2.3")).toBeNull();
  });

  it("rejects division by zero", () => {
    expect(evalArithmetic("5/0")).toBeNull();
  });

  it("does not execute code (the whole point of dropping Function())", () => {
    expect(evalArithmetic("process")).toBeNull();
    expect(evalArithmetic("globalThis")).toBeNull();
    expect(evalArithmetic("1;alert(1)")).toBeNull();
  });
});
