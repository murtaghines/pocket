# Plan: "Add entry" siempre visible al fondo del modal de mes

## Problema
Actualmente, dentro de `MonthReviewModal`, el botón **Add entry** vive en la fila de stats (Income / Expenses / Transfers) que está **arriba de la tabla**. Cuando hay muchas transacciones o se hace scroll, el botón desaparece y no se encuentra. El usuario espera verlo siempre, dentro de cada mes, anclado al fondo del modal y justo encima del resumen.

## Cambios

### 1. `src/components/profile/MonthReviewModal.tsx`

- **Quitar** el botón `Add entry` de la fila superior de stats (≈ líneas 1172–1182). La fila de arriba queda solo con el resumen (ingresos / gastos / transferencias / edited / hidden).
- **Crear una nueva barra estática** insertada entre el contenedor del cuerpo del workspace (`</div>` de línea 1513) y el "Workspace footer" existente (línea 1517). Esta barra:
  - Es un `div` con `border-t border-border bg-card px-6 py-3 flex items-center justify-between gap-3`.
  - **Izquierda:** botón `Add entry` (mismo estilo `outline` con tinte `primary` que el actual, ícono `PlusCircle`). Visible solo si `!isLocked`. Si está bloqueado, mostrar un texto pequeño "Month closed".
  - **Derecha:** mini-resumen compacto en la misma línea con: `N rows · + income · − expenses · ↔ transfers` usando los mismos pills que ya existen arriba (reutilizando `summary.income`, `summary.expenses`, `summary.transfers` y `transactions.length`).
- El "Workspace footer" actual (Cancel / Save) queda **debajo** de esta nueva barra, sin cambios.
- Resultado visual de abajo hacia arriba dentro del `DialogContent`:
  1. Tabla de transacciones (scrollable)
  2. **Barra estática nueva**: `[ + Add entry ]` …………… `12 rows · +1.234,56 · −890,00 · ↔ 2`
  3. Footer existente: `N unsaved · [Cancel] [Save]`

### 2. Mantener comportamiento
- El estado `showAddDialog` y `handleAddManualEntry` no cambian.
- La fila superior sigue mostrando los mismos chips (sin el botón) para no perder información a primera vista; si prefieres puedo eliminarla del todo y dejar el resumen solo abajo — me lo confirmas si quieres esa variante.

## Archivos afectados
- `src/components/profile/MonthReviewModal.tsx` (un solo archivo, edición localizada)

## Notas
- No se tocan estilos globales ni la lógica de inserción de transacciones manuales.
- La barra es parte del flujo del modal (no `position: fixed`), así que queda siempre visible porque solo el área de la tabla hace scroll — coincide con el patrón ya usado por el "Workspace footer" actual.
