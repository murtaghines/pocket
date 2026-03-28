

## Plan: Redesign Categories & Rules Section

### Changes

**1. Side-by-side layout for Income & Expenses (`CategoriesEditor.tsx`)**
- Replace the `Tabs` component with a two-column grid layout (`grid grid-cols-1 md:grid-cols-2 gap-6`)
- Each column gets its own header with the icon and count (e.g., "Income (7)" / "Expenses (13)")
- Both lists are always visible on wider screens, stacking vertically on mobile

**2. Remove redundant "Custom Rules" section (`CustomCategoriesManager.tsx`)**
- Remove the "Add rule to a category" button and the Rule Overrides section entirely (the override dialog and its state)
- Since every category already has an "Add rule" button inside its expanded view, this section is duplicative
- Keep only the "My Custom Categories" section with the "Create new category" button

**3. Visual refresh (`CategoryRulesList.tsx` + `CategoriesEditor.tsx`)**
- Remove the outer `Card` wrapper — use a cleaner open layout with subtle section headers
- Category items: remove the grey `bg-background` border box look, use a cleaner row style with a subtle bottom border or hover highlight instead of heavy bordered cards
- Add a small colored dot or left accent bar using the category's color for visual interest
- Rules inside expanded categories: use a slightly more polished pill/tag style
- Column headers get a subtle colored accent (green tint for Income, orange/warm tint for Expenses)

### Files to modify
1. **`src/components/settings/CategoriesEditor.tsx`** — Replace Tabs with side-by-side grid, remove Card wrapper, simplify header
2. **`src/components/settings/CategoryRulesList.tsx`** — Refresh item styling with color accents and cleaner rows
3. **`src/components/settings/CustomCategoriesManager.tsx`** — Remove the Rule Overrides section entirely, keep only Custom Categories

