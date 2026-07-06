import { describe, it, expect } from 'vitest';
import {
  mapCategorySlug,
  validateCategorySlug,
  INCOME_SLUGS,
  EXPENSE_SLUGS,
  TRANSFER_SLUGS,
} from '../supabase/functions/_shared/categoryMap';

// The category-slug resolution layer is the last hop before a category reaches the DB.
// These tests pin its behavior and, crucially, guard that EVERY category the categorizer can
// emit resolves to a slug that actually exists in the app. See docs/epics/uploads.md.

// The exhaustive set of categories the categorizer can output (from categorizer.ts type unions).
const CATEGORIZER_INCOME = [
  'salary', 'freelance', 'refunds', 'sales', 'investments_income',
  'gifts_received', 'rental_income', 'transfers_in', 'other_income',
];
const CATEGORIZER_EXPENSE = [
  'housing', 'groceries', 'restaurants', 'transport', 'health', 'entertainment',
  'shopping', 'education', 'subscriptions', 'travel', 'sports', 'pets',
  'gifts_given', 'personal_services', 'taxes', 'family', 'donations', 'insurance', 'other_expense',
];
const CATEGORIZER_TRANSFER = ['own_transfer', 'to_investment', 'to_joint_account'];

describe('mapCategorySlug', () => {
  it('passes through custom_ slugs untouched', () => {
    expect(mapCategorySlug('custom_ropa_bebe')).toBe('custom_ropa_bebe');
  });

  it('maps extended slugs to their app-level equivalent', () => {
    expect(mapCategorySlug('investments_income')).toBe('investment');
    expect(mapCategorySlug('rental_income')).toBe('rents');
    expect(mapCategorySlug('transfers_in')).toBe('transfers');
    expect(mapCategorySlug('taxes')).toBe('other_expense');
  });

  it('passes through unknown / already-app slugs unchanged', () => {
    expect(mapCategorySlug('groceries')).toBe('groceries');
    expect(mapCategorySlug('zzz_unknown')).toBe('zzz_unknown');
  });
});

describe('validateCategorySlug', () => {
  it('falls back to the generic bucket for a null slug, by movement', () => {
    expect(validateCategorySlug(null, 'INCOME')).toBe('other_income');
    expect(validateCategorySlug(null, 'EXPENSE')).toBe('other_expense');
    expect(validateCategorySlug(null, 'TRANSFER')).toBe('own_transfer');
  });

  it('normalizes case and spaces before matching', () => {
    expect(validateCategorySlug('Other Income', 'INCOME')).toBe('other_income');
    expect(validateCategorySlug('GROCERIES', 'EXPENSE')).toBe('groceries');
  });

  it('rejects a slug that is valid for a DIFFERENT movement', () => {
    // "groceries" is an expense; asked as INCOME it must fall back, not leak through.
    expect(validateCategorySlug('groceries', 'INCOME')).toBe('other_income');
    expect(validateCategorySlug('salary', 'EXPENSE')).toBe('other_expense');
  });
});

describe('completeness guard — every categorizer category resolves to a valid app slug', () => {
  it('INCOME categories all land in INCOME_SLUGS', () => {
    for (const cat of CATEGORIZER_INCOME) {
      expect(INCOME_SLUGS).toContain(validateCategorySlug(cat, 'INCOME'));
    }
  });

  it('EXPENSE categories all land in EXPENSE_SLUGS', () => {
    for (const cat of CATEGORIZER_EXPENSE) {
      expect(EXPENSE_SLUGS).toContain(validateCategorySlug(cat, 'EXPENSE'));
    }
  });

  it('TRANSFER categories all land in TRANSFER_SLUGS', () => {
    for (const cat of CATEGORIZER_TRANSFER) {
      expect(TRANSFER_SLUGS).toContain(validateCategorySlug(cat, 'TRANSFER'));
    }
  });
});

describe('KNOWN LOSSY MAPPING — to_joint_account collapses to own_transfer', () => {
  it('has no TRANSFER slug or map entry for joint-account transfers', () => {
    // The categorizer emits `to_joint_account` when a joint-account name matches, but the app
    // has no such transfer slug and no CATEGORY_SLUG_MAP entry, so it collapses to own_transfer —
    // joint-account transfers become indistinguishable from the user's own transfers.
    // Flagged for the epic; test locks in today's behavior.
    expect(mapCategorySlug('to_joint_account')).toBe('to_joint_account');
    expect(TRANSFER_SLUGS).not.toContain('to_joint_account');
    expect(validateCategorySlug('to_joint_account', 'TRANSFER')).toBe('own_transfer');
  });
});
