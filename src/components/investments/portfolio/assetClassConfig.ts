export interface AssetClassStyle {
  hue: number;
  sat: number;
  light: number;
  i18nKey: string;
}

export const ASSET_CLASS_CONFIG: Record<string, AssetClassStyle> = {
  stocks:       { hue: 216, sat: 75, light: 42, i18nKey: "stocks" },
  etf:          { hue: 200, sat: 85, light: 46, i18nKey: "etf" },
  bonds:        { hue: 198, sat: 85, light: 40, i18nKey: "bonds" },
  crypto:       { hue: 350, sat: 72, light: 55, i18nKey: "crypto" },
  real_estate:  { hue: 32,  sat: 90, light: 52, i18nKey: "realEstate" },
  cash:         { hue: 150, sat: 55, light: 40, i18nKey: "cash" },
  fci:          { hue: 260, sat: 60, light: 62, i18nKey: "fci" },
  commodities:  { hue: 45,  sat: 100, light: 45, i18nKey: "commodities" },
  other:        { hue: 220, sat: 10, light: 50, i18nKey: "other" },
};

export const ASSET_CLASS_KEYS = Object.keys(ASSET_CLASS_CONFIG);
