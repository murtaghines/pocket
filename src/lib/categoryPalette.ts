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
