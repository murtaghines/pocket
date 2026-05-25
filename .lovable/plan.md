## Objetivo

Renovar la navegación de la landing pública (`src/pages/Landing.tsx`) para que las secciones se superpongan al hacer scroll y haya parallax sutil en imágenes y textos, manteniendo intensidad media (3/5): moderna y divertida, sin marearse.

## Qué se cambia

Sólo la landing pública. Nada del dashboard ni de la lógica de negocio.

### 1. Sticky sections que se pisan
- Envolver cada sección (`HeroSection`, `HowItWorksSection`, `FeaturesSection`, `ContactSection`, `CTASection`) en un wrapper `sticky top-0` con `min-h-screen` y bordes redondeados arriba (`rounded-t-[2.5rem]`).
- Cada sección sucesiva sube por encima de la anterior con sombra superior (`shadow-2xl`), creando el efecto de "tarjetas apiladas" tipo Apple/Linear.
- El Hero queda al fondo; las siguientes lo cubren progresivamente. La última (`CTASection` + footer) cierra el stack.
- Fondos sólidos por sección para que el overlap sea visible:
  - Hero: azul `#1b76ff` (ya existe)
  - HowItWorks: blanco crema
  - Features: gris claro / azul muy claro
  - Contact: blanco
  - CTA: azul oscuro

### 2. Parallax suave (intensidad 3/5)
Usando `framer-motion` (ya disponible) con `useScroll` + `useTransform`:
- Hero: el headline grande "TRACK YOUR MONEY" se mueve a velocidad lenta (y: 0 → -80px) y la card flotante a velocidad media mientras se sale.
- FeaturesSection: las cards entran con `whileInView` (fade + translateY de 40px → 0, stagger 80ms).
- HowItWorks: el número de cada paso hace un parallax sutil (y: 0 → -30px) respecto al texto.
- Hero ghost headline "LIKE NEVER BEFORE" con un drift horizontal lento (-20px → +20px) durante scroll.

### 3. Header
- `LandingHeader` ya es sticky; ajustar para que cambie de fondo (`bg-transparent` → `bg-white/80 backdrop-blur`) tras pasar el hero usando `useScroll`.

### 4. Detalles de implementación
- Crear `src/components/landing/StickyStack.tsx`: wrapper genérico que recibe `children` y aplica `sticky top-0 min-h-screen rounded-t-[2.5rem] overflow-hidden shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.15)]`.
- Modificar `src/pages/Landing.tsx` para envolver cada sección con `StickyStack` (excepto Hero, que es la base).
- Añadir hooks de parallax inline en `HeroSection.tsx`, `HowItWorksSection.tsx`, `FeaturesSection.tsx`.
- Respetar `prefers-reduced-motion`: si está activo, desactivar los `useTransform` y dejar scroll normal.

### Archivos tocados
- `src/pages/Landing.tsx` (envolver con stack)
- `src/components/landing/StickyStack.tsx` (nuevo)
- `src/components/landing/HeroSection.tsx` (parallax headline + card)
- `src/components/landing/HowItWorksSection.tsx` (parallax números)
- `src/components/landing/FeaturesSection.tsx` (reveal on view)
- `src/components/landing/LandingHeader.tsx` (fondo dinámico al scrollear)

## Qué NO se toca
- Dashboard `/index`
- Auth, onboarding, edge functions, lógica de transacciones
- Colores/tokens del design system (sólo se usan los existentes)
