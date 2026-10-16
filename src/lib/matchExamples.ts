export type MatchType = "fuzzy" | "contains" | "starts_with" | "ends_with";

export interface MatchExample {
  text: string;
  highlight: [number, number];
}

export function buildMatchExamples(rawPattern: string, matchType: MatchType): MatchExample[] {
  const pattern = (rawPattern || "ejemplo").trim().toLowerCase();

  const wrap = (prefix: string, suffix: string): MatchExample => {
    const text = `${prefix}${pattern}${suffix}`;
    return { text, highlight: [prefix.length, prefix.length + pattern.length] };
  };

  switch (matchType) {
    case "starts_with":
      return [
        wrap("", " clientes"),
        wrap("", " sa pago"),
        wrap("", " oct"),
      ];

    case "ends_with":
      return [
        wrap("clientes ", ""),
        wrap("pago ", ""),
        wrap("tr · ", ""),
      ];

    case "contains":
    case "fuzzy":
    default:
      return [
        wrap("", " clientes"),
        wrap("pago ", ""),
        wrap("tr · ", ""),
      ];
  }
}
