# Handoff: Pocket — nuevo look & feel (Fase 1: Dashboard)

## Overview
Rediseño visual de Pocket: de "fondo gris oscuro + borde gris + relleno blanco" a
"fondo gris claro + tarjetas blancas sin borde + sombra muy suave". Más minimalista,
más suave, tipografía con jerarquía real. **Esta fase cubre SOLO la pantalla de
dashboard mensual** (`/dashboard`, granularidad "month"). Popups, modales y el resto
de las secciones quedan para fases siguientes.

## About the design files
`Pocket Redesign.dc.html` es una **referencia de diseño hecha en HTML**: un prototipo
que muestra el aspecto final, no código para copiar y pegar. La tarea es **recrear ese
diseño dentro del código real de Pocket** (React + TypeScript + Tailwind + shadcn/ui +
recharts), respetando los patrones que ya existen en el repo: `Card variant="bento"`,
tokens HSL en `src/index.css`, `useLocalization().formatCurrency`, i18n con
`react-i18next` (nunca strings hardcodeados), `cn()` para clases.

## Fidelity
**Alta fidelidad.** Colores, tipografías, tamaños, radios y sombras son definitivos.
Reprodúcelos exactamente. Los datos del prototipo son de ejemplo: la app sigue usando
sus hooks reales (`usePeriodAggregates`, `useDashboardData`, `useTransactions`, etc.).

---

## 1. Design tokens (cambiar primero, en `src/index.css`)

Estos son los cambios de raíz. Casi todo el resto sale de acá.

| Token | Antes | Ahora |
|---|---|---|
| Fondo de app | `#F4F5F7` (gris oscuro) | **`#F5F7F9`** |
| Borde de tarjeta | `#E5E7EB` 1px | **ninguno** (`border: 0`) |
| Sombra de tarjeta | `--shadow-section: none` | **`0 1px 2px rgba(16,24,40,.04), 0 6px 16px -6px rgba(16,24,40,.10)`** |
| Radio de tarjeta | 14px | **12px** |
| Radio de control | 8px | **9–10px** |

### Paleta
- Azul de marca / acciones: `#1B76FF`. **Solo** en botones primarios, links, estados
  activos y series de datos. Ninguna tarjeta de KPI es azul.
- Texto: `#0C0D0E` (principal) · `#414750` (botones, etiquetas fuertes) ·
  `#6B7280` (secundario) · `#8A919C` / `#9AA1AC` (terciario) · `#B4BAC3` /
  `#C2C7CE` (mínimo, headers de tabla, placeholders).
- Divisores: `#F1F2F4` (dentro de tarjeta) · `#F4F5F7` (filas de tabla).
- Superficies suaves: `#F5F7F9` (botón neutro, input, celda vacía) · `#FAFBFC`
  (header y pie de tabla).
- Semánticos: ingreso `#2E9E6B` · gasto `#D9542B` (texto) / `#E0704A` (relleno) ·
  neutro-transferencia `#8A919C`.
- Categorías (dot + pill): Compras `#6E6EDB` · Supermercado `#30A664` ·
  Transporte `#3B8AE0` · Vivienda `#EC6B45` · Suscripciones `#6E5BCB` ·
  Viajes `#FFD027` · Restaurantes `#FA7A2B` · Otros `#7F868F` · A inversión `#1B5CB8`.

### Tipografía
- **Quicksand 600** para títulos: título de página 21px (`letter-spacing:-.01em`),
  título de tarjeta 15px. **Se eliminan por completo** los títulos
  `13px/600/uppercase/tracking-.05em` que hoy repiten nueve veces por pantalla.
- **Inter** para todo lo demás: 13–13,5px cuerpo (400), 12,5px subtítulo (400, color
  `#9AA1AC`), 12px meta, 11px header de tabla (500, uppercase, `letter-spacing:.06em`,
  color `#9AA1AC` — este es el único uppercase que sobrevive).
- Números: **siempre** `font-variant-numeric: tabular-nums`. KPI 22px/600/`-.025em`.
  Importe en tabla 13px/500. Total en donut 19px/600/`-.02em`.

### Sombras
- Tarjeta: `0 1px 2px rgba(16,24,40,.04), 0 6px 16px -6px rgba(16,24,40,.10)`
- Botón/chip elevado: `0 1px 2px rgba(16,24,40,.05)`
- Botón primario: `0 1px 2px rgba(27,118,255,.3)`
- Tarjeta azul: `0 1px 2px rgba(27,118,255,.18), 0 8px 20px -8px rgba(27,118,255,.45)`

---

## 2. Navegación (`PrimaryNavBar.tsx`, `SecondaryNavBar.tsx`)

La barra sigue siendo **azul `#1B76FF` sólida** — solo se suaviza.

**Barra principal**, alto 58px, padding `0 26px`:
- Logo (asterisco blanco) 21px, margen derecho 28px.
- Tabs en `flex` con `gap: 28px`, estirados a la altura de la barra.
  - Activo: Quicksand 600 15px `#fff` + **`border-bottom: 2px solid #fff`** +
    chevron 13px a la derecha (abre la sub-navegación). **No hay píldora de fondo.**
  - Inactivo: Quicksand 500 15px `rgba(255,255,255,.62)`, `border-bottom: 2px solid transparent`.
- Derecha: campana 18px (badge `#FFD027` 7px con borde 1,5px del color de la barra) y
  chip de usuario: `background: rgba(255,255,255,.14)`, `border-radius: 999px`,
  padding `5px 10px 5px 5px`, avatar 24px blanco con iniciales `#1B76FF` 600 11px,
  nombre Inter 500 13,5px, chevron 13px.

**Barra secundaria** (misma superficie azul, sin separador), padding `11px 26px 13px 75px`,
`gap: 28px`: activo Quicksand **700** 13,5px `#fff`; inactivo 500 `rgba(255,255,255,.55)`.
Sin píldoras.

---

## 3. Header de la pantalla (`MonthTab.tsx` / `DashboardGreeting.tsx`)

`display:flex; justify-content:space-between; align-items:center`, padding `18px 0`.

- Izquierda: `h1` Quicksand 600 21px `#0C0D0E` con el mes ("Julio 2026").
  Debajo, Inter 400 13px `#8A919C`: **"Balance inicial <importe> · N movimientos"**.
  El importe va en 500 `#414750` con tabular-nums. (El "resumen del mes" se eliminó;
  el saldo de apertura del mes es el dato que arranca la lectura.)
- Derecha: chip "Filtros" (blanco, radio 10, padding `8px 13px`, sombra de chip, icono
  14px `#8A919C`) + navegador de mes: contenedor blanco radio 10, padding 5px, con
  `‹` 26px, etiqueta del mes Inter 500 13px centrada (min-width 88px) y `›` 26px.

---

## 4. Fila de KPIs — 5 tarjetas

`display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:12px`.
Tarjeta: blanca, radio 12, padding `16px 18px`, sombra de tarjeta.

Estructura de cada una: fila de etiqueta (dot 7px + Inter 500 13px `#6B7280`,
`margin-bottom:14px`) → valor (Inter 600 22px `-.025em` tabular-nums) → delta
(Inter 400 12,5px `#9AA1AC` con el % en 500 y color semántico).

1. **Ingresos** — dot `#2E9E6B`, valor `#0C0D0E`, delta verde.
2. **Gastos** — dot `#E0704A`, valor `#0C0D0E`, delta `#D9542B`.
3. **Balance neto** — dot `#0C0D0E`, valor `#D9542B` si es negativo. **Ya no es azul
   ni contiene el dato de inversión.** (Hoy es `NetBalanceCard` con fondo `#1B76FF`:
   eliminar ese fondo.)
4. **Tasa de ahorro** — valor + anillo 52px a la derecha
   (`SavingsRateRingCard`: pista `#F1F2F4`, trazo 7px, color `#E0704A` si es negativa),
   meta como subtítulo.
5. **Enviado a invertir** (nuevo, `InvestmentSummaryCard`) — dot `#1B76FF`, importe
   acumulado, delta del mes en `#1B76FF`.

---

## 5. Gráficos

Todos en tarjeta blanca, radio 12, padding `20px 22px 16px`, título Quicksand 600 15px
y subtítulo Inter 400 12,5px `#9AA1AC`. **Ningún gráfico lleva selector de mes**: la
vista ya es mensual y el mes está en el header (quitar los `Select`/`GranularityToggle`
internos de las tarjetas).

**a. Ingresos y gastos por semana** (`WeeklyIncomeExpensesChart`) — barras de 20px con
`border-radius: 6px` (redondeadas arriba y abajo), `gap: 5px` dentro del par,
alto 172px, sin eje ni grilla. Ingresos `#1B76FF`, gastos `#DCE0E6`. Leyenda con dots
8px. Etiquetas "sem 1…5" Inter 400 11,5px `#9AA1AC`.

**b. Cuentas** (`AccountsStackCard`) — filas de `padding: 11px 0` separadas por
`1px solid #F1F2F4`: icono 34px radio 10 con fondo al 12% del color de la cuenta,
nombre Inter 500 13,5px, "N movimientos" 12px `#9AA1AC`, saldo 600 14px tabular.

**c. Balance diario** (`DailyFlowChart`) — línea `#1B76FF` 2,2px con área en degradado
(`.16 → 0`), grilla horizontal `#F1F2F4`, sin eje Y. Cierre del mes a la derecha del
título en 600 13px con color semántico.

**d. Gasto por día** (`DailyHeatmapCard`) — calendario **completo del mes** (celdas
vacías al principio para alinear el día de la semana), `grid-template-columns:repeat(7,1fr)`,
`gap: 6px`, celdas `aspect-ratio: 1` con `border-radius: 8px`. Intensidad =
`rgba(27,118,255,α)` con α proporcional al gasto; día sin gasto `#F7F8FA` con número
`#C2C7CE`. Número de día 11px (500 con gasto, 400 sin). Encabezados L M X J V S D en
500 10,5px `#B4BAC3`. **Las métricas van en una segunda columna a la derecha, alineadas
a la base**: Día más alto / Día más bajo / Promedio diario (etiqueta 11px `#9AA1AC`,
valor 600 15px, día de referencia 11px `#B4BAC3`). Sin escala menos/más.

**e. Ingresos por categoría** (`IncomeCategoryReferenceCard`) — **única tarjeta de
color**: fondo `#5191FF` (variante clara del azul de marca), radio 12, sombra azul.
Se conserva la geometría que ya tiene el componente (`TRACK_START_DEG=205`,
`TRACK_SWEEP_DEG=220`, pista `rgba(255,255,255,.15)`, estilos de anillo
blanco / negro / rayado) con estos ajustes:
- Anillos **finos**: `strokeWidth: 13` fijo (no 28), radios 100 / 67 / 34 en un
  viewBox de 420×238 con centro (300,112) — el anillo externo tiene que entrar completo,
  con aire arriba y abajo.
- La leyenda pasa **abajo a la izquierda** y se conecta con el gráfico: por cada
  categoría, nombre (Inter 500 13,5px `#fff`) → **línea punteada**
  (`stroke-dasharray:3 4`, `rgba(255,255,255,.65)`) → marcador circular r=4,5 con borde
  blanco 1,4px **posicionado exactamente al final del carril de su anillo**
  (`ángulo = START + SWEEP`) → porcentaje (600 13,5px).
  Las filas se ordenan por la altura de ese punto para que las líneas no se crucen.
  Dibujá leyenda y conectores **dentro del mismo `<svg>`** que los anillos; con
  posicionamiento HTML las líneas no caen sobre el anillo.

**f. Gasto por categoría** (`SpendingByCategoryChart`) — se conserva tal cual está
(gauge `startAngle 225 / endAngle -45`, `innerRadius 72%`, `paddingAngle 2`,
`cornerRadius 5`, total en el centro en 600 19px). Solo dos ajustes:
- Lista más compacta: `padding: 3px 0` por fila y columnas
  `134px 46px 92px 54px` con `gap: 10px` — el porcentaje va **pegado** al nombre,
  no al otro extremo de la tarjeta.
- El grupo gauge + lista se centra (`justify-content:center`, `gap: 26px`) y el gauge
  mide 200×186. Se reduce el alto total de la tarjeta.

**g. Mayores gastos** (`TopExpensesCard`) — top 5. Fila: índice 500 12px `#C2C7CE`,
icono de categoría 32px radio 10 con fondo al 13% de su color, nombre 500 13,5px,
"fecha · categoría" 12px `#9AA1AC`, importe 600 13,5px. Separador `1px solid #F4F5F7`.

**h. Flujo del mes** (nuevo, sugerido: `MonthlyFlowSankey.tsx`) — Sankey de tres
columnas: entradas → cuentas → categorías de gasto. Barras de 30px radio 7 con el color
del nodo; bandas en degradado del color de origen (`opacity .34`) al de destino
(`.20`), con curva cúbica (puntos de control al 45% y 55% del tramo). Encabezados
"ENTRADAS / CUENTAS / GASTOS" en 500 10,5px `#C2C7CE` uppercase `letter-spacing:.06em`.
Etiquetas de **una sola línea** apoyadas sobre las bandas: nombre 500 11px `#414750` +
importe 400 11px `#9AA1AC`; sin recuadro blanco de fondo. La primera columna arranca en
x=0 y la última termina en el borde derecho (a todo el ancho de la tarjeta). Sin nota
al pie. Ojo: el total de entradas tiene que igualar el de gastos — si el mes cierra en
negativo, incluí el saldo de apertura como una entrada más ("Saldo anterior").

---

## 6. Tabla de movimientos del dashboard (`TransactionCardList` / `TransactionTable`)

- Header de tabla: alto 34px, fondo `#FAFBFC`, borde arriba y abajo `1px solid #F1F2F4`,
  celdas Inter 500 11px uppercase `letter-spacing:.06em` `#9AA1AC`.
- Filas: **alto 40px** (hoy 62–74px), separador `1px solid #F4F5F7`, hover `#FAFBFC`.
  **Sin líneas verticales.**
- Columnas: Fecha · Descripción · Tipo · Categoría · Cuenta · Importe · **Balance**.
- **Tipo de movimiento** (`pill-badge`): pill radio 999, padding `3px 10px`, fondo del
  color del movimiento **al 14% de opacidad**, texto en la versión oscura de ese color,
  dot 6px del color pleno. Gasto `#E0704A`/`#C24A22`, ingreso `#2E9E6B`/`#217A49`,
  transferencia `#8A919C`/`#5A6270`. (Se eliminan los badges sólidos rojo/amarillo.)
- **Categoría**: pill radio 999, padding `3px 10px 3px 8px`, fondo del color de la
  categoría **al 13%**, texto en su versión oscura, y el **icono** de la categoría
  (13px, `stroke-width:1.9`) en lugar del dot — usar `category-icon.tsx`.
- **Importes en negro** (`#0C0D0E`): sin rojo ni verde, la pill ya dice el tipo. Las
  **transferencias** van en gris `#8A919C` y con signo explícito (`+100,00 €`).
- **Balance**: saldo corrido, 400 13px `#8A919C`. La primera fila del mes tiene que
  coincidir con el balance inicial del header y la última con el saldo de cierre.
- Pie: fondo `#FAFBFC`, borde superior `1px solid #F1F2F4`, resúmenes con dot 6px +
  Inter 400 13px `#6B7280`, y "Saldo final <importe>" a la derecha en 600.

---

## 7. Controles (para reutilizar en toda la app)

- **Botón neutro**: fondo `#F5F7F9`, radio 9, padding `7px 11px`, Inter 500 13px
  `#414750`, icono 14px `#8A919C`.
- **Botón elevado sobre el fondo**: igual pero fondo `#fff` + sombra de chip.
- **Botón primario**: fondo `#1B76FF`, texto `#fff` 500 13px, radio 9,
  padding `8px 14px`, sombra `0 1px 2px rgba(27,118,255,.3)`.
- **Chip de filtro activo**: fondo `#1B76FF`, contador en `rgba(255,255,255,.24)`
  radio 999.
- **Checkbox**: 15px, radio 4, borde `1,5px solid #D5D9DF`; marcado `#1B76FF`.
- **Toggle**: 40×24 radio 999, thumb 18px blanco; activo `#1B76FF`, inactivo `#E4E7EB`.
- **Input**: fondo `#F5F7F9`, radio 10, padding `11px 13px`, texto 14px `#0C0D0E`.

---

## 8. Orden de la pantalla (de arriba a abajo)

1. Navegación principal + secundaria (azul).
2. Header: mes + balance inicial + filtros + navegador de mes.
3. Fila de 5 KPIs.
4. Ingresos y gastos por semana (1,55fr) · Cuentas (1fr).
5. Balance diario (1,55fr) · Gasto por día (1fr).
6. **Ingresos por categoría** (1fr, azul) · **Gasto por categoría** (1,62fr).
7. **Flujo del mes** (1,62fr) · **Mayores gastos** (1fr).
8. Movimientos (ancho completo).

`gap: 14px` entre filas y columnas; padding del contenido `8px 28px 30px`.

---

## 9. Fuera de alcance en esta fase
Popups, menús contextuales, modales, la vista de datos/transacciones completa,
Investments, Planning, week/year/history. El prototipo los incluye como referencia
(bloques 1d–1g), pero **no los toques todavía**.

## 10. Checklist de aceptación
- [ ] No queda **ningún** `border: 1px solid #E5E7EB` en tarjetas del dashboard.
- [ ] No queda **ningún** título de tarjeta en uppercase con tracking.
- [ ] Ninguna tarjeta de KPI tiene fondo azul; la única tarjeta de color es
      "Ingresos por categoría".
- [ ] Las filas de tabla miden 40px y los importes no usan color (salvo transferencias
      en gris).
- [ ] El balance corrido cierra: fila 1 = balance inicial, última fila = saldo de cierre.
- [ ] Ninguna tarjeta de gráfico tiene selector de mes.
- [ ] Todo el texto sale de i18n (es/en), nada hardcodeado.

## Files
- `Pocket Redesign.dc.html` — prototipo completo. Abrilo en el navegador; el dashboard
  es el bloque con el badge `1b`.
- `PROMPT.md` — el mensaje corto para pegarle a Claude Code.
