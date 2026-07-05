---
paths:
  - "src/pages/Categories.tsx"
  - "src/components/settings/**"
  - "src/hooks/useCategories.tsx"
  - "src/hooks/useCustomCategories.tsx"
  - "src/hooks/useCategorizationRules.tsx"
---
# Categories & rules
- Cambios en reglas de categorización impactan directo el pipeline de imports
  (categorizer, apply-rules-retroactive) — ver .claude/rules/imports.md
- Colores custom de categoría: nunca negro, blanco, verde de income, rojo de expense,
  azul/amarillo de marca, ni gris/plateado/dorado (reservados por el design system)
- CreateCategoryDialog es solo UI — no tocar lógica de guardado sin revisar el hook