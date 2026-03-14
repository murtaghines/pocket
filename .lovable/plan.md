

## Plan: Categories System Revamp (3 Parts)

### Current State
- **OnboardingModal**: Already 4 steps (Language, Country, Investments, JointAccount) — no categories step. Already imports `DEFAULT_INCOME_CATEGORIES` / `DEFAULT_EXPENSE_CATEGORIES` but only to save them all on completion. **No StepCategories exists.** The user's verification request is already satisfied — the categories step was removed in the previous implementation.
- **CategoriesEditor**: Shows standard categories grouped by income/expense with expandable rules per category. Already supports adding rules to existing categories via `categorization_rules` table.
- **Categorizer**: Already has `UserContext.customCategories` and `CustomCategory` interface with fuzzy matching. Already handles custom categories BEFORE standard rules.
- **process-import edge function**: Builds `UserContext` but does NOT include `jointAccountNames`, `investmentPlatforms`, or `customCategories`.

### What Needs to Change

**Part 1: OnboardingModal cleanup** — Minor. Remove unused `DEFAULT_INCOME_CATEGORIES`/`DEFAULT_EXPENSE_CATEGORIES` imports from OnboardingModal (line 13-16). The `handleComplete` still references them (line 77, 88) — remove `selected_categories` from the `updatePreferences` call. The modal already has no categories step.

**Part 2: Profile Categories Section** — The existing `CategoriesEditor` already shows standard categories + rules. Enhance it:
1. Add a read-only note explaining categories are always active
2. Add ability to **create custom categories** (new name + movement type + keywords) — stored in `categorization_rules` table with a new approach, OR in a new `custom_categories` jsonb column on `profiles`
3. Keep existing rule-adding flow for standard categories

Given the user's data model suggestion (`custom_category_rules` jsonb on profiles), I'll follow that approach:
- Add `custom_category_rules jsonb DEFAULT '[]'` to `profiles` table
- Create a new `CustomCategoriesManager` component for creating/editing/deleting custom categories
- Update `CategoriesEditor` to include the transparency note + custom categories section
- Add a `useCustomCategories` hook for CRUD on `profiles.custom_category_rules`

**Part 3: Connect to Categorizer** — Update `process-import/index.ts` to:
- Fetch `profiles.joint_account_names`, `profiles.investment_platforms`, `profiles.custom_category_rules`
- Map `custom_category_rules` entries to `UserContext.customCategories` and inject rule overrides
- Add `categoryRuleOverrides` support to the categorizer (new field on UserContext + check in `categorize()` before standard rules)

### Files

**Database Migration:**
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_category_rules jsonb DEFAULT '[]';
```

**Create:**
- `src/components/settings/CustomCategoriesManager.tsx` — UI for creating/managing custom categories with name, movement type, and keyword chips
- `src/hooks/useCustomCategories.tsx` — CRUD hook for `profiles.custom_category_rules`

**Modify:**
- `src/components/onboarding/OnboardingModal.tsx` — Remove category imports and `selected_categories` from save
- `src/components/settings/CategoriesEditor.tsx` — Add transparency note, integrate custom categories section
- `supabase/functions/_shared/categorizer.ts` — Add `categoryRuleOverrides` to `UserContext`, check overrides in `categorize()` before standard rules
- `supabase/functions/process-import/index.ts` — Expand profile query to include `joint_account_names`, `investment_platforms`, `custom_category_rules`; build full `UserContext` with custom categories and rule overrides
- `src/i18n/locales/en/settings.json`, `es/settings.json`, `pt/settings.json` — Add translations for custom categories UI

### Rule Override Logic in Categorizer
Add to `UserContext`:
```typescript
categoryRuleOverrides?: { targetCategory: string; keywords: string[] }[];
```

In `categorize()`, after custom categories check (Step 2) and before standard rules (Step 3), add Step 2.5:
- For each override, fuzzy-match keywords against description
- If matched, find the standard category slug and return it with confidence 0.95

