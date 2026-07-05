---
paths:
  - "src/pages/Categories.tsx"
  - "src/components/settings/**"
  - "src/hooks/useCategories.tsx"
  - "src/hooks/useCustomCategories.tsx"
  - "src/hooks/useCategorizationRules.tsx"
---
# Categories & rules
- Changes to categorization rules directly affect the imports pipeline
  (`categorizer`, `apply-rules-retroactive`) — see .claude/rules/imports.md
- Custom category colors: never black, white, income green, expense red, brand
  blue/yellow, or grey/silver/gold (reserved by the design system)
- `CreateCategoryDialog` is UI only — don't touch save logic without checking the hook
