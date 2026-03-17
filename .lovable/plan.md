

## Plan: Editar reglas de categorización

### Contexto
Actualmente las reglas solo se pueden agregar y borrar. El usuario quiere poder **editar** el patrón y el tipo de match. La DB soporta 3 match types: `CONTAINS`, `STARTS_WITH`, `REGEX` — pero la UI solo muestra 2 (Contains y Exact/Starts With).

### Cambios

#### 1. Convertir `AddRuleDialog` → `RuleDialog` (add + edit)
- Aceptar prop opcional `editingRule: { id, pattern, matchType }` para modo edición.
- Pre-llenar los campos cuando se edita.
- Exponer los 3 match types reales: **Contains**, **Starts With**, **Regex**.
- Cambiar título dinámico: "Add Rule" vs "Edit Rule".

#### 2. Agregar `updateRule` mutation en `useCategorizationRules`
- Nueva mutation que hace `UPDATE categorization_rules SET pattern, match_type WHERE id = ruleId`.

#### 3. Agregar botón Edit en `CategoryRulesList`
- Junto al botón de borrar (Trash), agregar un icono de edición (Pencil).
- Al clickear, invocar `onEditRule(rule)` que abre el dialog en modo edición.

#### 4. Orquestar en `CategoriesEditor`
- Manejar estado `editRuleFor: { ruleId, categoryId, categoryName, pattern, matchType } | null`.
- Pasar al dialog reutilizado.

#### 5. Traducciones
- Agregar keys: `categories.startsWith`, `categories.regex`, `categories.regexHelp` en EN/ES/PT.

### Archivos a modificar
- `src/components/settings/AddRuleDialog.tsx` — refactor a dual-mode
- `src/components/settings/CategoryRulesList.tsx` — agregar botón edit + callback
- `src/components/settings/CategoriesEditor.tsx` — manejar estado de edición
- `src/hooks/useCategorizationRules.tsx` — agregar `updateRule` mutation
- `src/i18n/locales/en/settings.json`, `es/settings.json`, `pt/settings.json` — nuevas keys

