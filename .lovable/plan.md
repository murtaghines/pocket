## Simplificar la sección DATA en la barra lateral

### Alcance
Cambiar el encabezado de la sección **DATA** en `src/components/layout/DataRail.tsx` para que muestre solo el texto **"DATA"**, eliminando el icono de Upload y el texto "Data · uploads".

### Cambio propuesto
1. En `DataRail.tsx`, en el bloque que encabeza la sección de datos (líneas ~302-313), quitar el icono `<Upload>` y dejar solo el label "DATA".
2. Mantener el comportamiento actual: en el rail colapsado la sección sigue mostrando solo los íconos de items (Bank statements, Investment files, Categories & rules); en el rail expandido se lee únicamente "DATA" como título del grupo.
3. No se tocan rutas, tooltips ni el resto de la navegación.

### Archivos afectados
- `src/components/layout/DataRail.tsx`

### Verificación
- Revisar visualmente el sidebar en modo expandido y colapsado.
- Ejecutar `npm run lint` antes de finalizar.