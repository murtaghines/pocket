## Respuesta corta

**Sí, pero con un matiz importante.** Depende de *dónde* crees la regla:

| Dónde la creás | Tabla | ¿Se aplica en próximos uploads? |
|---|---|---|
| Settings → Categorías → "Añadir regla" (ej. *Oxigent → Salary*) | `categorization_rules` | ✅ Sí, con **prioridad máxima** (anula al categorizador genérico de "transferencia de…") |
| My Data → editar una transacción y guardar como regla aprendida | `user_rules` | ❌ **No**, hoy `process-import` no lee esta tabla |

Por cómo está hoy `process-import`:

```
1. Categorizador genérico (regex "TRANSFERENCIA DE …") → transfers_in
2. Sign guardrail (positivo = INCOME)
3. ⮕ applyCategoryRules() — categorization_rules del usuario, SOBREESCRIBE lo anterior
4. Sign sanity check final
```

Entonces si creás la regla **desde Settings** con patrón `OXIGENT` (CONTAINS) → categoría *Salary*, el próximo Oxigent que aparezca queda como **Salary / Income**, no como Transfers.

## Propuesta de cambio

Para que sea consistente y "lo que edites en My Data se aprenda", propongo cerrar el gap:

### 1. `process-import` también consume `user_rules`
Cargar `user_rules` activas del usuario y aplicarlas **antes** del categorizador genérico (misma prioridad que las de Settings, ordenadas por `source = 'user_correction'` > `'manual'` y luego por `created_at` desc).

Reutilizar la misma lógica de matching que ya existe en `process-financial-file` (`applyUserRules` con tipos `fuzzy` / `contains` / `starts_with` / `exact` / `regex`).

### 2. Orden de prioridad final (unificado)
```
1. user_rules (correcciones aprendidas en My Data)         ← NUEVO en process-import
2. categorization_rules (reglas de Settings)               ← ya funciona
3. Detección de auto-transferencias (mismo banco/usuario)  ← ya funciona
4. Categorizador genérico (regex compartido)               ← ya funciona
5. Fallback por signo (+ → other_income, - → other_expense)
6. Sign sanity check
```

### 3. UX — confirmar al usuario
Cuando edites Oxigent en My Data y elijas "Crear regla", mostrar un toast: *"Próximas transacciones con 'Oxigent' se categorizarán como Salary automáticamente."*

### 4. Sin migración de datos
No hace falta tocar la base. Las reglas ya creadas seguirán funcionando; sólo amplía qué tablas lee el importador.

## Archivos a tocar

- `supabase/functions/process-import/index.ts` — añadir carga de `user_rules` + función `applyUserRules` (copiada/extraída desde `process-financial-file`), invocarla antes de `applyCategoryRules`.
- (Opcional) extraer el matcher a `supabase/functions/_shared/userRulesMatcher.ts` para evitar duplicación.

## Qué NO cambia
- Categorizador genérico sigue tratando "Transferencia de X" como TRANSFER por defecto — correcto, como vos decís.
- Sign guardrail sigue activo (positivo nunca es expense salvo TRANSFER).
- Las reglas custom siempre ganan, así que tu Oxigent siempre saldrá como Salary.