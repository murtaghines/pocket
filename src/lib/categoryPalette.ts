// Shared category color palette. Used by both the custom-category creator
// (CreateCategoryDialog) and the per-category color/icon overrides picker
// (ColorIconPicker) so the two views stay visually in sync.
//
// The icon palettes are intentionally NOT shared — the creator dialog uses
// a small curated starter set, while the visual-override popover exposes
// the full library. Keep them local to their components.

export const CURATED_COLORS = [
  // Row 1 — Cool / brand family
  '203 60% 51%', // Pocket blue (default)
  '210 70% 60%',
  '220 65% 55%',
  '230 55% 60%',
  '250 55% 62%',
  '270 50% 60%',
  '190 65% 48%',
  '180 55% 45%',
  '170 55% 42%',
  '155 50% 45%',
  '140 45% 48%',
  '120 40% 50%',
  // Row 2 — Warm / earth / neutrals
  '50 85% 55%',
  '40 90% 55%',
  '30 85% 55%',
  '20 80% 55%',
  '10 75% 55%',
  '355 70% 58%',
  '335 60% 58%',
  '315 50% 55%',
  '25 40% 45%',
  '35 35% 40%',
  '210 15% 50%',
  '215 20% 35%',
];

// 36-color palette for the Edit Category modal (3 rows × 12).
// Hex values from the spec; used by EditCategoryModal's color grid.
export const EXPANDED_PALETTE = [
  // Row 1 — Blues → violets
  '#60C9D4', '#3BADE0', '#4A95E8', '#1B76FF', '#2E6FB8', '#1B4FA8',
  '#4F4FB5', '#6E5BCF', '#8E5BC7', '#A03BB8', '#C2458D', '#D64A7D',
  // Row 2 — Pinks → yellows
  '#E05670', '#D4435E', '#C2314A', '#C24A22', '#D86A2E', '#E68A2E',
  '#D8891F', '#E6B13C', '#D4A82E', '#B98708', '#8A7E2E', '#A8B034',
  // Row 3 — Greens → neutrals
  '#7CB342', '#5F8A3B', '#4F8A2B', '#217A49', '#1A8E6B', '#10968A',
  '#1A8696', '#2B7A8E', '#8B6B4F', '#776B5F', '#5A6069', '#2E3338',
];
