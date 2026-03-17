

## Plan: Texto explicativo dinámico por tipo de match + agregar "Exact Match"

### Descubrimiento
Revisando el motor de categorización (`process-import/index.ts`), encontré que soporta **4 tipos** (no 3):
- `contains` — el texto aparece en cualquier parte de la descripción
- `starts_with` — la descripción empieza con ese texto
- `exact` — la descripción es exactamente igual al texto
- `regex` — patrón avanzado de expresión regular

Actualmente la UI solo muestra 3 (falta Exact Match).

Tambien hay un **bug**: el motor compara en minúsculas (`'contains'`), pero la UI guarda en mayúsculas (`'CONTAINS'`). Hay que alinear esto.

### Cambios

#### 1. Agregar "Exact Match" como 4ta opción en el dialog
Un `SelectItem` más con valor `EXACT`.

#### 2. Texto de ayuda dinámico debajo del selector de Match Type
En vez de mostrar ayuda solo para Regex, mostrar una descripción clara para **cada** tipo:

- **Contains**: "If the transaction description includes this text anywhere, it will match. Example: 'Netflix' matches 'NETFLIX MONTHLY PAYMENT'."
- **Starts With**: "Matches only if the description begins with this text. Example: 'BIZUM' matches 'BIZUM DE JUAN' but not 'PAGO BIZUM'."
- **Exact Match**: "Matches only if the description is exactly this text, word for word. Useful for very specific transactions."
- **Regex**: "Advanced: use a regular expression pattern. Example: 'amazon|amzn' matches both 'AMAZON' and 'AMZN MKTP'."

#### 3. Fix bug de case mismatch
Actualizar `process-import/index.ts` para comparar con `.toLowerCase()` o uppercase, alineando con lo que guarda la DB.

#### 4. Traducciones EN/ES/PT
Agregar keys para las 4 descripciones de ayuda y para "Exact Match".

### Archivos a modificar
- `src/components/settings/AddRuleDialog.tsx` — agregar Exact Match + texto dinámico por tipo
- `supabase/functions/process-import/index.ts` — fix case comparison
- `supabase/functions/apply-rules-retroactive/index.ts` — verificar mismo fix
- `src/i18n/locales/en/settings.json` — nuevas keys de ayuda
- `src/i18n/locales/es/settings.json` — traducciones
- `src/i18n/locales/pt/settings.json` — traducciones

