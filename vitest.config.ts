import { defineConfig } from 'vitest/config';
import path from 'path';

// Test config for the imports pipeline safety net (see docs/epics/uploads.md).
// The pipeline's pure functions (categorizer, userRules, excelParser, fingerprint)
// live in both src/ and supabase/functions/_shared/, so tests import across both.
export default defineConfig({
  resolve: {
    // Mirror the app's `@` -> src alias so tests can import modules that use it
    // (e.g. src/lib/analytics.ts imports @/lib/categoryTranslations).
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globals: false,
  },
});
