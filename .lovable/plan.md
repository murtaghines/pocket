

## Mejoras al modal "Edit transactions"

Voy a mejorar el modal `MonthReviewModal` (que se abre desde "My Data" al hacer click en un upload) con cuatro funcionalidades nuevas: visibilidad clara de qué fila se editó, comparación con el valor anterior, edición de monto con ayuda para "split", y la posibilidad de ocultar/mostrar transacciones (soft delete).

### 1. Identificar qué filas fueron editadas

- Cada fila editada en la sesión actual mostrará un **badge azul "Edited"** al lado de la descripción y un **borde lateral izquierdo azul** (similar al amarillo actual de mismatches).
- En cada celda modificada (movement, category, amount) se mostrará el **valor anterior tachado** en pequeño debajo del nuevo valor, en gris. Ejemplo: muestra `Salary` arriba y `~~Other income~~` debajo.
- El chip "1 edited" del header pasa a ser **clickeable**: al hacerle click hace scroll a la primera fila editada.

### 2. Editar el monto (Amount)

- La columna **Amount** se vuelve editable: input numérico con el mismo estilo de los selects.
- Al hacer hover sobre el input aparece un **botón pequeño "Split"** (icono de divisor) que abre un mini-popover con:
  - Input "Split between N people" (default 1)
  - Preview del nuevo monto (`amount / N`)
  - Botón "Apply" que reemplaza el monto.
- Se preserva el **signo original** (negativo para expense, positivo para income) automáticamente según el movement seleccionado.
- El monto editado también muestra el valor anterior tachado debajo.

### 3. Ocultar/mostrar transacciones (soft delete)

Implementación con un nuevo campo `is_hidden boolean` en la tabla `transactions`:

- Nueva columna al final: **icono de ojo** (`Eye` / `EyeOff` de lucide).
  - Click → marca la fila como oculta: se atenúa al 40% de opacidad y se tacha.
  - Click de nuevo → la restaura.
- Las transacciones ocultas **no se cuentan** en el summary del header (income, expenses, transfers).
- Toggle en el header del modal: **"Show hidden (N)"** para colapsar/mostrar las filas ocultas dentro del modal.
- En **toda la app** (dashboard, gráficos, totales, heatmap, exports), las transacciones con `is_hidden = true` se filtran. Esto se hace agregando `.eq("is_hidden", false)` (o `.or("is_hidden.is.null,is_hidden.eq.false")`) en todas las queries de `transactions`.

Las filas ocultas **siguen existiendo en la base de datos** — el usuario las puede revertir en cualquier momento. No se borra nada.

### 4. Acceso a transacciones ocultas

- En el modal: el toggle "Show hidden" las trae de vuelta visualmente con su estilo atenuado para poder restaurarlas.
- (Más adelante se podría agregar una vista global "Hidden transactions" en Settings, pero por ahora con el toggle del modal alcanza.)

---

### Cambios técnicos

**Base de datos (migración)**:
```sql
ALTER TABLE public.transactions 
  ADD COLUMN is_hidden boolean NOT NULL DEFAULT false;

CREATE INDEX idx_transactions_user_hidden 
  ON public.transactions(user_id, is_hidden) 
  WHERE is_hidden = false;
```

**Archivos a modificar**:

| Archivo | Cambio |
|---|---|
| `supabase/migrations/<new>.sql` | Agrega columna `is_hidden` + índice |
| `src/components/profile/MonthReviewModal.tsx` | Badges "Edited", valores anteriores, edición de amount, popover Split, columna hide/show, toggle "Show hidden", lógica de scroll al chip |
| `src/hooks/useTransactions.tsx` | Agrega `.eq("is_hidden", false)` por defecto + opción `includeHidden` |
| `src/components/dashboard/DailyHeatmapCard.tsx` | Filtra `is_hidden` |
| `src/components/dashboard/*Chart.tsx`, `StatCard`, `TopExpensesCard`, `TransactionTable`, etc. | Donde se consuman transacciones, respetan el flag (heredado del hook) |
| `src/components/profile/UnifiedUploadsTable.tsx` | El conteo por upload excluye ocultas |

**Lógica de Split (cliente)**:
```ts
const newAmount = Math.sign(originalAmount) * (Math.abs(originalAmount) / splitCount);
```

**Estado local de edits** (extiende la interfaz existente):
```ts
interface TransactionEdits {
  movement?: MovementType;
  category?: string;
  amount?: number;        // nuevo
  is_hidden?: boolean;    // nuevo
  splitCount?: number;    // metadata para mostrar "÷6"
}
```

Al guardar, el `update` de Supabase envía también `amount` e `is_hidden` cuando estén presentes. La regla automática (smart rule) **no** se crea cuando el único cambio es el monto o el hide (sólo se crea cuando cambia categoría/movimiento, como hoy).

### Compatibilidad

- Las transacciones existentes quedan con `is_hidden = false` por default → ningún cambio visible para datos actuales.
- Editar el amount no afecta la deduplicación (el `fingerprint` ya está calculado; no se recalcula al editar manualmente).
- Los meses **cerrados (locked)** mantienen su comportamiento: no se puede editar amount, hide, movement ni categoría.

