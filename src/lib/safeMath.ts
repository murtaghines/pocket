/**
 * Evaluate a simple arithmetic expression over decimal numbers, supporting `+ - * /`,
 * parentheses and unary sign. Returns `null` for anything malformed, a division by zero, or a
 * non-finite result.
 *
 * This replaces a previous `Function("return (…)")()` eval in the amount editor: it's a small
 * recursive-descent parser, so it is safe by construction (no code execution) and can't be
 * tricked into evaluating arbitrary JS.
 *
 * Grammar:
 *   expr   = term (('+' | '-') term)*
 *   term   = factor (('*' | '/') factor)*
 *   factor = ('+' | '-') factor | number | '(' expr ')'
 */
export function evalArithmetic(input: string): number | null {
  const s = input.replace(/\s+/g, "");
  if (s === "") return null;

  let pos = 0;
  const peek = () => s[pos];

  const parseNumber = (): number | null => {
    const start = pos;
    while (pos < s.length && /[\d.]/.test(s[pos])) pos++;
    if (pos === start) return null;
    const token = s.slice(start, pos);
    if ((token.match(/\./g) || []).length > 1) return null; // e.g. "1.2.3"
    const n = parseFloat(token);
    return Number.isFinite(n) ? n : null;
  };

  const parseFactor = (): number | null => {
    const c = peek();
    if (c === "+" || c === "-") {
      pos++;
      const f = parseFactor();
      return f === null ? null : c === "-" ? -f : f;
    }
    if (c === "(") {
      pos++;
      const e = parseExpr();
      if (e === null || peek() !== ")") return null;
      pos++;
      return e;
    }
    return parseNumber();
  };

  const parseTerm = (): number | null => {
    let left = parseFactor();
    if (left === null) return null;
    while (peek() === "*" || peek() === "/") {
      const op = s[pos++];
      const right = parseFactor();
      if (right === null) return null;
      if (op === "*") {
        left *= right;
      } else {
        if (right === 0) return null; // division by zero
        left /= right;
      }
    }
    return left;
  };

  function parseExpr(): number | null {
    let left = parseTerm();
    if (left === null) return null;
    while (peek() === "+" || peek() === "-") {
      const op = s[pos++];
      const right = parseTerm();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseExpr();
  if (result === null || pos !== s.length) return null; // trailing garbage
  return Number.isFinite(result) ? result : null;
}
