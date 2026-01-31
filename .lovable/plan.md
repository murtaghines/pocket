
# Plan: Rediseño Dark Theme al estilo Autonoma

## Resumen
Transformar la aplicación fint a un look oscuro y moderno inspirado en getautonoma.com, reemplazando los azules de Autonoma por el violeta de la marca fint (`hsl(229, 100%, 66%)`).

## Inspiración Visual (Autonoma)
- Fondo oscuro casi negro (#0A0A0A / #111111)
- Cards con bordes sutiles y fondos ligeramente más claros
- Header con fondo semi-transparente con blur
- Tipografía blanca y grises claros
- Acentos de color usados estratégicamente (botones CTA, highlights)
- Estilo minimalista y profesional

## Cambios a Realizar

### 1. Variables CSS (src/index.css)

**Modo Light - Convertir a Dark por defecto:**
```
:root {
  --background: 0 0% 4%;           /* Negro profundo #0A0A0A */
  --foreground: 0 0% 98%;          /* Blanco casi puro */
  
  --card: 0 0% 7%;                 /* Cards oscuras #121212 */
  --card-foreground: 0 0% 98%;
  
  --popover: 0 0% 7%;
  --popover-foreground: 0 0% 98%;
  
  --primary: 229 100% 66%;         /* Violeta fint (mantener) */
  --primary-foreground: 0 0% 100%;
  
  --secondary: 0 0% 12%;           /* Gris oscuro */
  --secondary-foreground: 0 0% 98%;
  
  --muted: 0 0% 12%;
  --muted-foreground: 0 0% 60%;    /* Gris medio para texto secundario */
  
  --accent: 0 0% 15%;
  --accent-foreground: 0 0% 98%;
  
  --border: 0 0% 15%;              /* Bordes sutiles */
  --input: 0 0% 15%;
  --ring: 229 100% 66%;            /* Violeta para focus */
}
```

**Actualizar gradientes y sombras para modo dark:**
- Gradients con transparencias
- Sombras suaves con negro
- Glow effects con el violeta

### 2. Header (src/components/layout/Header.tsx)

- Fondo semi-transparente oscuro con backdrop-blur
- Logo blanco (usar fint-text-white.png)
- Navegación con hover states sutiles
- Bordes más sutiles

### 3. Cards (src/components/ui/card.tsx)

- Variantes actualizadas para tema dark
- Bordes sutiles (#1a1a1a aproximadamente)
- Hover states con elevación sutil
- Glassmorphism opcional para algunas cards

### 4. Página de Auth (src/pages/Auth.tsx)

- Mantener el diseño actual con fondo violeta
- Card blanca contrastando (ya está bien)
- Solo ajustes menores si es necesario

### 5. Dashboard y otras páginas

- Aplicar nuevo tema dark automáticamente via CSS variables
- StatCards con gradientes sutiles
- Charts con colores adaptados al tema oscuro
- Textos y labels con contraste correcto

### 6. Componentes adicionales

**Botones:**
- Primary: Violeta sólido
- Secondary: Fondo oscuro con borde sutil
- Ghost: Sin fondo, hover con fondo sutil

**Inputs:**
- Fondo oscuro (#121212)
- Bordes sutiles
- Focus ring violeta

**Tables:**
- Filas alternadas con tonos oscuros
- Headers ligeramente más oscuros

### 7. Footer

- Borde superior sutil
- Texto gris medio

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/index.css` | Variables CSS para tema dark, gradientes, sombras |
| `src/components/layout/Header.tsx` | Logo blanco, fondo semi-transparente |
| `src/components/ui/card.tsx` | Variantes dark-optimized |
| `src/components/ui/button.tsx` | Ajustes de colores para contraste |
| `src/pages/Index.tsx` | Ajustes de colores específicos si es necesario |
| `src/pages/Investments.tsx` | Ajustes de colores específicos |
| `src/pages/Profile.tsx` | Ajustes de colores específicos |

## Sección Técnica

### Paleta de Colores Exacta

```text
┌─────────────────────────────────────────────────────┐
│  FONDOS                                             │
├─────────────────────────────────────────────────────┤
│  Background:     hsl(0 0% 4%)      →  #0A0A0A       │
│  Card:           hsl(0 0% 7%)      →  #121212       │
│  Elevated:       hsl(0 0% 10%)     →  #1A1A1A       │
│  Surface:        hsl(0 0% 12%)     →  #1F1F1F       │
├─────────────────────────────────────────────────────┤
│  TEXTOS                                             │
├─────────────────────────────────────────────────────┤
│  Primary:        hsl(0 0% 98%)     →  #FAFAFA       │
│  Secondary:      hsl(0 0% 70%)     →  #B3B3B3       │
│  Muted:          hsl(0 0% 50%)     →  #808080       │
├─────────────────────────────────────────────────────┤
│  ACENTO (Violeta fint)                              │
├─────────────────────────────────────────────────────┤
│  Primary:        hsl(229 100% 66%) →  #5271FF       │
│  Primary Light:  hsl(229 100% 75%) →  #7A93FF       │
│  Primary Dark:   hsl(229 100% 55%) →  #3B56E0       │
├─────────────────────────────────────────────────────┤
│  BORDES                                             │
├─────────────────────────────────────────────────────┤
│  Default:        hsl(0 0% 15%)     →  #262626       │
│  Subtle:         hsl(0 0% 12%)     →  #1F1F1F       │
└─────────────────────────────────────────────────────┘
```

### Consideraciones de Implementación

1. **Eliminación del modo claro**: Hacer el tema dark el default y único
2. **Contrast ratios**: Asegurar WCAG AA compliance (4.5:1 para texto normal)
3. **Gradientes**: Usar transparencias del violeta para efectos sutiles
4. **Transiciones**: Mantener las animaciones existentes

### Impacto en Componentes

- Los colores de categorías se mantendrán (ya tienen buen contraste)
- Los charts de Recharts usarán los nuevos colores via CSS variables
- Las notificaciones/toasts usarán el nuevo tema
