

## Plan: Redesign Profile Page — Titles Inside Cards, Integrated Custom Categories with Color & Icon Picker

### Summary
Move section titles inside their white cards, rename "Accounts" to "Banking Accounts", eliminate the separate "My Custom Categories" section, and integrate custom categories directly into the Income/Expense lists with a "Create new category" button under the Categories title. Custom categories appear inline (with a visual badge marking them as user-created and a delete button). Add a curated color palette picker and icon picker to the create dialog.

### Changes

**1. Profile.tsx — Titles inside cards**
- Move each `SectionHeader` inside its corresponding `bg-card` container instead of above it
- Rename "Accounts" title to "Banking Accounts"
- Remove the separate Custom Categories section entirely (no more `<CustomCategoriesManager />` as a standalone block)

**2. CategoriesEditor.tsx — Integrated custom category creation**
- Add a "Create new category" button next to the Categories section title (inside the card, at the top)
- Remove the `<CustomCategoriesManager />` import and the separate border-t section
- When creating a custom category, the user picks: name, type (Income/Expense), keywords, color (from curated palette), and icon (from curated Lucide icon set)
- Store `color` (HSL string) and `icon` (Lucide icon name) in the `CustomCategoryRule` type

**3. CustomCategoryRule type update (useCustomCategories.tsx)**
- Add optional `color?: string` and `icon?: string` fields to `CustomCategoryRule`
- These store the user's chosen HSL color and Lucide icon name

**4. CategoryRulesList.tsx — Show custom categories inline**
- Accept a new prop `customCategories` (filtered by movement type)
- Render custom categories at the bottom of each list with:
  - The user-chosen color as the accent bar (falling back to a default)
  - The user-chosen icon (falling back to "circle")
  - A small "Custom" badge to distinguish from system categories
  - A delete button (trash icon) on hover
  - Expandable like system categories to show keywords as rules
- System categories do NOT have a delete button

**5. Create Category Dialog — Color & Icon picker**
- **Color palette**: A curated grid of ~12-16 HSL colors (avoiding red/green per the existing design system). Rendered as clickable circles with a check mark on the selected one.
- **Icon picker**: A curated grid of ~20-24 common Lucide icons (e.g., coffee, gift, baby, music, book, wrench, scissors, palette, flame, zap, sparkles, crown, star, tag, anchor, compass, umbrella, wine, cake, dog, cat, truck, shield, key). Rendered as a scrollable grid of clickable icon buttons.
- Both selections are optional with sensible defaults (grey color, circle icon)

**6. useCategoryTranslations.tsx — Support custom category visuals**
- When `getCategoryColor` or `getCategoryIcon` is called with a custom category slug not in the hardcoded maps, the caller will pass the custom color/icon directly. No changes needed to this hook — the `CategoryRulesList` component will use the custom values directly for custom categories.

### Files to modify
1. `src/pages/Profile.tsx` — titles inside cards, rename Accounts, remove standalone CustomCategoriesManager
2. `src/components/settings/CategoriesEditor.tsx` — add "Create new category" button, integrate creation dialog, pass custom categories to lists
3. `src/hooks/useCustomCategories.tsx` — add `color` and `icon` fields to type
4. `src/components/settings/CategoryRulesList.tsx` — render custom categories inline with delete, custom visuals
5. `src/components/settings/CustomCategoriesManager.tsx` — repurpose as just the Dialog component (or inline into CategoriesEditor)

