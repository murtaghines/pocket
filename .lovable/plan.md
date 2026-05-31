# Rediseño del diálogo "Create new category"

Cambios solo en `src/components/settings/CreateCategoryDialog.tsx` (UI, sin tocar lógica de guardado).

## 1. Paleta de colores alineada a la marca

Reemplazar los 16 colores actuales por **24 colores** (2 filas completas de 12), ordenados por tono y construidos alrededor del azul pastel de Pocket (`#3391D0` ≈ `203 60% 51%`).

Orden: del azul de marca → análogos fríos → verdes → cálidos → cálidos profundos → neutros. Cada color con suficiente diferencia de tono/saturación para que no haya repetidos visualmente.

**Fila 1 — Familia fría/marca (azules, cyans, teals, verdes):**
```
203 60% 51%  ← Pocket blue (default)
210 70% 60%
220 65% 55%
230 55% 60%
250 55% 62%
270 50% 60%
190 65% 48%
180 55% 45%
170 55% 42%
155 50% 45%
140 45% 48%
120 40% 50%
```

**Fila 2 — Familia cálida/tierra/neutros (amarillos, naranjas, rojos, rosas, marrones, grises):**
```
50 85% 55%
40 90% 55%
30 85% 55%
20 80% 55%
10 75% 55%
355 70% 58%
335 60% 58%
315 50% 55%
25 40% 45%
35 35% 40%
210 15% 50%
215 20% 35%
```

Resultado: 2 filas perfectas de 12, gradiente continuo, sin duplicados perceptuales, ancla en el azul de marca como primer chip y default.

## 2. Íconos invisibles

Causa: cuando el color elegido es el azul de marca, el ícono seleccionado se pinta del mismo azul sobre fondo `color/0.1` (muy claro) — pero los **no seleccionados** se muestran con `text-muted-foreground` sobre fondo blanco, lo cual debería ser visible. Revisando el screenshot, los slots están vacíos: probablemente el render de Lucide falla por el casing del nombre o el tamaño 14 con stroke fino.

Fix:
- Subir el tamaño del ícono a `16` y asegurar `strokeWidth={2}`.
- Forzar color de ícono no seleccionado a `text-foreground/70` (no `muted-foreground` que es casi invisible sobre blanco en el tema actual).
- Para el seleccionado: si el color del chip es muy claro, usar el color a 100% sobre fondo `color/0.15`; ya está así, mantener.
- Verificar que `icons[iconName]` resuelve (kebab-case correcto en `CURATED_ICONS`). Confirmar que ninguno cambió de nombre en la versión de Lucide instalada.

## 3. Preview row confuso

La fila inferior con "e.g. Hobbies, Side Projects..." + badge "Custom" es un **preview** de cómo se verá la categoría con el ícono+color+nombre elegidos. El usuario no lo entiende.

Opciones (elegir la más limpia):
- **Eliminar** el bloque preview completo. El usuario ya ve el ícono seleccionado destacado en la grilla con su color, no necesita una segunda representación.

Recomendación: **eliminar**. Simplifica el diálogo y reduce altura.

## 4. Detalles visuales menores

- Color picker: chips de `w-7 h-7` → `w-8 h-8`, gap `2`, grid de 12 columnas explícito (`grid grid-cols-12 gap-2`) para garantizar 2 filas exactas en cualquier ancho.
- Icon picker: mantener grid pero asegurar que los íconos se rendericen con buen contraste (ver punto 2).
- Quitar la última oración del helper text ("Transactions matching your keywords…") si quedó pegada; dejar solo la frase corta de "appears in your dashboard".

## Archivos afectados

- `src/components/settings/CreateCategoryDialog.tsx` — actualizar `CURATED_COLORS` (24 valores), tamaño/color de íconos, eliminar bloque Preview, ajustar grid del color picker.

Sin cambios en lógica, hooks, traducciones ni backend.
