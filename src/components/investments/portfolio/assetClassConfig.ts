export interface AssetClassStyle {
  cssVar: string;
  i18nKey: string;
}

export const ASSET_CLASS_CONFIG: Record<string, AssetClassStyle> = {
  stocks:       { cssVar: "--asset-stocks",      i18nKey: "stocks" },
  etf:          { cssVar: "--asset-etf",          i18nKey: "etf" },
  bonds:        { cssVar: "--asset-bonds",        i18nKey: "bonds" },
  crypto:       { cssVar: "--asset-crypto",       i18nKey: "crypto" },
  real_estate:  { cssVar: "--asset-real-estate",  i18nKey: "realEstate" },
  cash:         { cssVar: "--asset-cash",         i18nKey: "cash" },
  fci:          { cssVar: "--asset-fci",           i18nKey: "fci" },
  commodities:  { cssVar: "--asset-commodities",  i18nKey: "commodities" },
  other:        { cssVar: "--asset-other",        i18nKey: "other" },
};

export const ASSET_CLASS_KEYS = Object.keys(ASSET_CLASS_CONFIG);

export function assetColor(cfg: AssetClassStyle): string {
  return `hsl(var(${cfg.cssVar}))`;
}

export function assetColorAlpha(cfg: AssetClassStyle, alpha: number): string {
  return `hsl(var(${cfg.cssVar}) / ${alpha})`;
}

export function assetColorDarken(cfg: AssetClassStyle): string {
  return `color-mix(in srgb, hsl(var(${cfg.cssVar})) 85%, black)`;
}
