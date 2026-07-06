import { defineConfig } from 'vitest/config';

// Test config for the imports pipeline safety net (see docs/epics/uploads.md).
// The pipeline's pure functions (categorizer, userRules, excelParser, fingerprint)
// live in both src/ and supabase/functions/_shared/, so tests import across both.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
  },
});
