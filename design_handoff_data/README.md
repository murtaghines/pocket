# Handoff · Sección Data (Extractos)

Rediseño de la vista de transacciones: **Data → Extractos** (`/data`). Misma dirección
visual que el dashboard —fondo gris claro, tarjetas blancas sin borde, sombra suave,
azul solo en acciones— aplicada a la tabla completa y editable.

Referencia visual: `Pocket Redesign.dc.html` → bloque con badge **`1d`**. El selector de
mes está en el bloque **`1e`** (tercera tarjeta, "Selector de mes").

**Alta fidelidad**: los valores de abajo son definitivos.
**No es un cambio de lógica**: se mantienen hooks, queries, edición en línea y el modelo
de datos. Todo el texto sale de i18n (es/en).

Prerrequisito: los tokens de la fase 1 (`design_handoff_pocket_dashboard/README.md`,
sección 1) ya deberían estar aplicados — fondo `#F5F7F9`, sombra de tarjeta, radio 12,
sin borde en `Card variant="bento"`. Si no lo están, aplicalos primero.

---

## 1. Qué está mal hoy

- Encabezado sobrecargado: el título en 26px compite con seis controles en la misma
  línea, y el badge azul "113 transactions" repite un número que ya está en el pie.
- Filas de 62–74px: demasiado aire para una tabla de escaneo.
- Badges de movimiento sólidos rojo/amarillo saturado, con chevrons de edición
  siempre visibles al lado de cada pill.
- Importes coloreados en rojo y verde, encima de las pills que ya dicen el tipo.
- Solo se puede cambiar de mes con flechas: llegar a agosto 2024 son 24 clics.
- No hay forma de ver cómo cada movimiento afecta el saldo.

---

## 2. Navegación (idéntica al dashboard)

Barra principal azul `#1B76FF`, alto 58px, padding `0 26px`. Tab **data** activa:
Quicksand 600 15px `#fff` + `border-bottom:2px solid #fff` + chevron 13px. Inactivas:
Quicksand 500 15px `rgba(255,255,255,.62)`. `gap:28px`, sin píldoras.

Barra secundaria, misma superficie azul, padding `11px 26px 13px 75px`, `gap:28px`:
**extractos** activo en Quicksand **700** 13,5px `#fff`; inversiones y categorías en
500 `rgba(255,255,255,.55)`.

---

## 3. Encabezado de la vista

Fondo blanco, padding `20px 24px 16px`, `display:flex; align-items:center; gap:14px`.

### Izquierda
- **Mes** — Quicksand 600 20px `#0C0D0E`, `letter-spacing:-.01em` ("Agosto 2026").
- Debajo, Inter 400 12,5px `#9AA1AC`: **"Saldo inicial <importe>"**, con el importe en
  500 `#414750` tabular-nums.
  El conteo de movimientos **no va acá**: ya está en el pie de la tabla.

### Navegador de mes — tres botones
Contenedor `background:#F5F7F9; border-radius:9px; padding:3px; gap:2px;
margin-left:6px`. Tres botones de 28×28 y radio 7:

1. `‹` — mes anterior (chevron 15px `#414750`).
2. `›` — mes siguiente.
3. **Calendario** — icono 15px, fondo `#fff` + `box-shadow:0 1px 2px rgba(16,24,40,.07)`
   para distinguirlo. Abre el **selector de mes** (sección 6).

No va la etiqueta del mes entre las flechas: el mes ya está en el título.

### Derecha
`margin-left:auto; display:flex; gap:6px`.
- **Ordenar**, **Filtrar**, **Exportar** — fondo `#F5F7F9`, radio 9, padding `7px 11px`,
  Inter 500 13px `#414750`, icono 14px `#8A919C` `stroke-width:1.9`, `gap:6px`.
- **Nuevo** — primario: fondo `#1B76FF`, texto `#fff` 500 13px, radio 9,
  padding `8px 14px`, sombra `0 1px 2px rgba(27,118,255,.3)`, icono `+` 14px.
  El copy pasa de "Add new transaction" a **"Nuevo"**.

Se elimina el badge azul "113 transactions" del encabezado.

---

## 4. Tabla

Grilla única para header y filas:
`grid-template-columns: 44px 84px 84px 1fr 136px 184px 106px 106px 40px`,
padding lateral `0 12px`, `align-items:center`. **Sin líneas verticales.**

Columnas: **checkbox · Fecha · Cuenta · Descripción · Tipo · Categoría · Importe ·
Balance · acciones**.

### Header
Alto **34px**, fondo `#FAFBFC`, borde arriba y abajo `1px solid #F1F2F4`.
Celdas Inter 500 11px, uppercase, `letter-spacing:.06em`, `#9AA1AC`. Importe y Balance a
la derecha. Checkbox de "seleccionar todo" en la primera celda, centrado.

### Filas
Alto **40px** (hoy 62–74px), separador `1px solid #F4F5F7`, hover `#FAFBFC`.

| Columna | Estilo |
|---|---|
| Checkbox | 15px, radio 4, borde `1,5px solid #D5D9DF`; marcado `#1B76FF`. Centrado |
| Fecha | Inter 400 13px `#6B7280`, tabular-nums, formato corto `15 ago` |
| Cuenta | Inter 400 13px `#6B7280` (etiqueta corta: "Personal", "Joint") |
| Descripción | Inter 400 13,5px `#0C0D0E`, `padding-right:16px`, elipsis, una línea |
| Tipo | pill (abajo) |
| Categoría | pill con icono (abajo) |
| Importe | Inter 500 13px, tabular-nums, derecha |
| Balance | Inter 400 13px `#8A919C`, tabular-nums, derecha |
| Acciones | `···` Inter 600 14px `#C2C7CE`, centrado. Abre el menú contextual |

Los chevrons de edición al lado de cada pill **desaparecen**: se edita con clic en la
celda o desde el menú `···`.

### Pills de Tipo
`display:inline-flex; align-items:center; gap:6px; border-radius:999px;
padding:3px 10px; width:fit-content`, Inter 500 12,5px. Dot 6px del color pleno, fondo
del mismo color al **14%**, texto en su versión oscura:

| Tipo | dot | fondo | texto |
|---|---|---|---|
| Gasto | `#E0704A` | `rgba(224,112,74,.14)` | `#C24A22` |
| Ingreso | `#2E9E6B` | `rgba(46,158,107,.14)` | `#217A49` |
| Transferencia | `#8A919C` | `rgba(122,132,148,.14)` | `#5A6270` |

Se eliminan los badges sólidos (`#E53114` con texto blanco, `#F0B429` con texto oscuro).

### Pills de Categoría
Igual pero `padding:3px 10px 3px 8px`, fondo del color de la categoría al **13%**, texto
en su versión oscura, y el **icono** de la categoría (13px, `stroke-width:1.9`,
`stroke-linecap/linejoin:round`) en lugar del dot — usar `category-icon.tsx`.

| Categoría | color | fondo | texto |
|---|---|---|---|
| Supermercado | `#30A664` | `rgba(48,166,100,.13)` | `#217A49` |
| Vivienda | `#EC6B45` | `rgba(236,107,69,.13)` | `#C24A22` |
| Transporte | `#3B8AE0` | `rgba(59,138,224,.13)` | `#2E6FB8` |
| Compras | `#6E6EDB` | `rgba(110,110,219,.13)` | `#4F4FB5` |
| Suscripciones | `#6E5BCB` | `rgba(110,91,203,.13)` | `#5344A6` |
| A inversión | `#1B5CB8` | `rgba(27,92,184,.13)` | `#1B5CB8` |
| A mí mismo | `#737C8C` | `rgba(115,124,140,.14)` | `#5A6270` |
| Otros | `#7F868F` | `rgba(127,134,143,.13)` | `#656C75` |

### Color de los importes
- Gastos e ingresos: **negro** `#0C0D0E`. Sin rojo ni verde — la pill ya dice el tipo.
- **Transferencias**: gris `#8A919C` y con **signo explícito** (`+100,00 €`).
- Negativos con el signo menos tipográfico `−` (U+2212), no el guion.

### Columna Balance (nueva)
Saldo corrido de la cuenta consolidada, calculado **desde el movimiento más viejo del
mes hacia arriba** (la tabla lista del más nuevo al más viejo).

- Primera fila cronológica = saldo inicial del mes + su importe.
- El saldo inicial es el mismo número que muestra el encabezado.
- La última fila (la más nueva, arriba de todo) tiene que coincidir con el **saldo final**
  del pie, y ese saldo final es el saldo inicial del mes siguiente.

Si esos tres números no cierran, es un bug de cálculo, no de estilo.

---

## 5. Pie de la tabla

Fondo `#FAFBFC`, borde superior `1px solid #F1F2F4`, padding `14px 20px`,
`display:flex; align-items:center; gap:20px`.

- "113 filas" — Inter 400 13px `#6B7280`.
- Tres resúmenes con dot 6px + Inter 400 13px `#6B7280`: ingresos (`#2E9E6B`), gastos
  (`#E0704A`), transferencias (`#B4BAC3`). Sin colorear el texto ni el importe.
- `margin-left:auto`: **"Saldo final <importe>"** — etiqueta 400 13px `#6B7280`,
  importe 600 `#0C0D0E` tabular-nums.
- **Cerrar mes** — botón blanco radio 9, padding `7px 12px`, sombra
  `0 1px 2px rgba(16,24,40,.06)`, Inter 500 13px `#414750`, candado 14px `#8A919C`.

---

## 6. Selector de mes (popover del botón calendario)

Es el único popup de esta fase, porque sin él el botón nuevo no hace nada.
Prototipo: bloque `1e`, tarjeta "Selector de mes".

Panel de **252px**, blanco, radio 12, padding 12,
`box-shadow: 0 10px 34px -8px rgba(16,24,40,.20), 0 2px 6px rgba(16,24,40,.06)`.
Sin bordes ni cabeceras de color: estilo ajustes de iOS.

- **Fila de año**: `‹` 26px · año Inter 600 14px `#0C0D0E` tabular-nums, centrado ·
  `›` 26px. Flecha deshabilitada en `#C2C7CE` cuando no hay más años.
- **Grilla de meses**: `grid-template-columns:repeat(3,1fr); gap:4px`, celdas de 32px,
  radio 9, Inter 13px.
  - Mes seleccionado: fondo `#1B76FF`, texto `#fff` 600.
  - Mes con datos: texto `#0C0D0E` 400, sin fondo (hover `#F5F7F9`).
  - Mes sin datos: texto `#C2C7CE` 400, no clickeable.
- Divisor `1px solid #F1F2F4` con margen `10px 2px 6px`.
- Dos atajos, filas de 32px, radio 8, Inter 400 13,5px `#0C0D0E`, con su valor a la
  derecha en 400 12px `#B4BAC3`: **"Ir a hoy"** (`ago 2026`) y **"Primer mes con datos"**
  (`mar 2023`).

---

## 7. Fuera de alcance
Menú contextual del `···`, modal de edición, selector de categoría, confirmaciones y
toasts. Están diseñados en los bloques `1e` y `1f` del prototipo pero van en otra fase.
Tampoco se tocan Inversiones ni Categorías dentro de Data.

---

## 8. Checklist de aceptación

- [ ] Barra de navegación con subrayado (no píldora) y **extractos** en negrita blanca.
- [ ] Encabezado: mes + saldo inicial a la izquierda, `‹ › 📅` al lado, acciones a la
      derecha. Sin badge de "N transactions".
- [ ] El botón de calendario abre el selector de mes y permite saltar de año.
- [ ] Filas de 40px, sin líneas verticales, sin chevrons junto a las pills.
- [ ] Pills de tipo translúcidas al 14% con dot; categorías al 13% con icono.
- [ ] Importes en negro; transferencias en gris con signo.
- [ ] Columna Balance: primera fila = saldo inicial, última = saldo final del pie.
- [ ] Pie con filas, tres resúmenes, saldo final y "Cerrar mes".
- [ ] Todo el texto viene de i18n.
