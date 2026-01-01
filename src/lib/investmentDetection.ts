// Helpers to classify “investment movements” (e.g. Savings / Cocos / MyInvestor)
// so they can be treated as neutral movements (not income/expense).

const INVESTMENT_KEYWORDS = [
  "savings",
  "instant access",
  "myinvestor",
  "cocos",
];

export function isInvestmentMovementDescription(description: string): boolean {
  const d = (description || "").toLowerCase();
  return INVESTMENT_KEYWORDS.some((k) => d.includes(k));
}
