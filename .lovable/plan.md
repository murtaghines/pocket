
# Cambiar tipografía a `inherit`

## Resumen
Remover las fuentes personalizadas (Inter y Space Grotesk) y usar `inherit` para que toda la aplicación use la tipografía del sistema o del navegador.

## Cambios necesarios

### 1. `src/index.css`
- **Eliminar** la línea de importación de Google Fonts (línea 5)
- **Cambiar** `font-family: 'Inter', sans-serif;` a `font-family: inherit;` en el body
- **Eliminar** la regla de font-family para headings (h1-h6)

### 2. `tailwind.config.ts`
- **Eliminar o modificar** la configuración de `fontFamily` para que use `inherit` en lugar de las fuentes personalizadas

## Detalles técnicos

### Archivo: `src/index.css`
```css
/* ELIMINAR esta línea */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

/* MODIFICAR el bloque base */
@layer base {
  body {
    @apply bg-background text-foreground antialiased;
    font-family: inherit;
  }
  
  /* ELIMINAR estas líneas de headings */
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Space Grotesk', sans-serif;
  }
}
```

### Archivo: `tailwind.config.ts`
```typescript
// MODIFICAR fontFamily para usar inherit
fontFamily: {
  sans: ['inherit'],
  display: ['inherit'],
},
```

## Beneficios
- La app usará la fuente predeterminada del sistema/navegador
- Menor tiempo de carga al no descargar fuentes externas
- Mejor rendimiento inicial (no hay FOIT/FOUT)

## Consideraciones
- El aspecto visual cambiará ya que las fuentes del sistema varían entre dispositivos (San Francisco en Mac/iOS, Segoe UI en Windows, Roboto en Android)
- Si en el futuro quieres una apariencia más consistente, podrías usar una system font stack en lugar de solo `inherit`
