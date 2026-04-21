// Curated palette for bank accounts. Two ramps: blues/neutrals and yellows/mustards.
// Used by AccountsStackCard (dashboard) and AccountsManager (settings) so the user
// can pick a color and see it consistently in both places.

export const ACCOUNT_COLOR_PALETTE = {
  blues: [
    "#cde7f7",
    "#a9d4f5",
    "#155fd6",
    "#0a2a5e",
    "#b8c4d6",
    "#7a8499",
  ],
  yellows: [
    "#fff1a8",
    "#f5d76e",
    "#ffd027",
    "#cfa83a",
  ],
} as const;

export const ALL_ACCOUNT_COLORS: string[] = [
  ...ACCOUNT_COLOR_PALETTE.blues,
  ...ACCOUNT_COLOR_PALETTE.yellows,
];

// Default rotation when an account doesn't have a color set yet.
// Mirrors the previous VARIANTS order so existing accounts keep their look.
const DEFAULT_ROTATION = [
  "#ffd027",
  "#7a8499",
  "#b8c4d6",
  "#0a2a5e",
  "#a9d4f5",
  "#fff1a8",
  "#cfa83a",
  "#cde7f7",
  "#155fd6",
  "#f5d76e",
];

export function getDefaultAccountColor(index: number): string {
  return DEFAULT_ROTATION[index % DEFAULT_ROTATION.length];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const full = clean.length === 3
    ? clean.split("").map((c) => c + c).join("")
    : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Relative luminance per WCAG 2.x
function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function isLightColor(hex: string): boolean {
  return relativeLuminance(hex) > 0.55;
}

export type AccountColorStyle = {
  bg: string;          // inline background-color
  text: string;        // hex foreground
  sub: string;         // rgba muted foreground
  circleBg: string;    // rgba decorative circle
};

export function getAccountColorStyle(hex: string | null | undefined): AccountColorStyle {
  const safe = hex && /^#?[0-9a-fA-F]{3,8}$/.test(hex) ? (hex.startsWith("#") ? hex : `#${hex}`) : "#1b76ff";
  const light = isLightColor(safe);
  if (light) {
    // Dark text on light background
    return {
      bg: safe,
      text: "#0a2a5e",
      sub: "rgba(10, 42, 94, 0.65)",
      circleBg: "rgba(10, 42, 94, 0.06)",
    };
  }
  return {
    bg: safe,
    text: "#ffffff",
    sub: "rgba(255, 255, 255, 0.72)",
    circleBg: "rgba(255, 255, 255, 0.12)",
  };
}