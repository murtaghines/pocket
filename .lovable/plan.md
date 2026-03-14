

## Verificacion y Correccion del Flujo de Periodos Abiertos/Cerrados

### Problemas Encontrados

Despues de revisar todo el codigo, encontre estos problemas concretos:

1. **Drag-and-drop ignora el candado**: Si un mes esta cerrado (candado cerrado), el usuario puede arrastrar archivos sobre el slot y el sistema intenta procesarlos. Recien en el backend se rechaza con error "period_closed". La UI deberia bloquearlo antes.

2. **No hay validacion client-side antes de subir**: El hook `useMonthlyFileUpload` envia archivos directamente al backend sin verificar si el periodo esta cerrado. Esto causa el error que viste.

3. **Race condition al reabrir**: Cuando el usuario hace clic en "Reabrir mes", la query de periodos se invalida y se refresca. Pero si el usuario intenta subir un archivo antes de que termine el refetch, el backend podria seguir viendo el periodo como cerrado.

### Solucion Propuesta

#### 1. Bloquear drag-and-drop en meses cerrados
En `MonthUploadSlot.tsx`, el handler `handleDrop` debe verificar `isClosed` y mostrar un toast de advertencia en vez de intentar subir.

#### 2. Bloquear el area de upload cuando esta cerrado
El area de upload (drop zone vacia) y el boton "Add more files" ya se ocultan correctamente cuando `isClosed` es true. Pero el drag-and-drop sigue activo. Se agregara la verificacion ahi.

#### 3. Pasar el estado del periodo al hook de upload
Modificar `addFilesForMonth` para aceptar un parametro opcional de estado del periodo, o hacer la verificacion directamente en `MonthUploadSlot` antes de llamar a `onAddFiles`.

### Cambios Tecnicos

**Archivo: `src/components/profile/MonthUploadSlot.tsx`**
- En `handleDrop`: agregar verificacion `if (isClosed)` al inicio, mostrando un toast "Este mes esta cerrado. Reabrilo para subir archivos" y haciendo return sin procesar.
- En `handleFileInput`: agregar la misma verificacion `if (isClosed)`.
- Deshabilitar visualmente el area de drag cuando el mes esta cerrado (agregar clase CSS de opacidad reducida y cursor no permitido).

**Archivo: `src/hooks/useMonthlyFileUpload.tsx`**
- No requiere cambios, la validacion se hara en la UI antes de llamar a `addFilesForMonth`.

### Resultado Esperado
- Si el candado esta cerrado: no se puede subir de ninguna forma (ni drag, ni click, ni input). Se muestra un mensaje claro.
- Si el candado esta abierto: funciona normal.
- El backend sigue como segunda linea de defensa por si algo pasa.

