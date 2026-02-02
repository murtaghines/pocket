

# Plan: Redisenar seccion "How it works" al estilo Autonoma

## Objetivo

Replicar exactamente el diseno de pasos de Autonoma: layout de dos columnas donde la mitad izquierda es blanca con el numero, titulo, descripcion y un enlace CTA, y la mitad derecha es un contenedor gris con un visual/mockup.

---

## Diseno de Referencia

Basado en la imagen de Autonoma:

```text
+------------------------------------------+------------------------------------------+
|  (fondo blanco)                          |  (fondo gris #f5f5f5)                    |
|                                          |                                          |
|  1    Set up the project.                |  +----------------------------------+    |
|                                          |  |                                  |    |
|       Load the mobile or web app         |  |     [Screenshot/Mockup]          |    |
|       you want to run tests over.        |  |                                  |    |
|                                          |  |                                  |    |
|       Create an app →                    |  +----------------------------------+    |
|                                          |                                          |
+------------------------------------------+------------------------------------------+
                          (linea divisoria horizontal)
+------------------------------------------+------------------------------------------+
|  2    Start testing in minutes.          |  +----------------------------------+    |
...
```

---

## Cambios Principales

### 1. Layout de Dos Columnas 50/50

- **Izquierda (50%)**: Fondo blanco puro
- **Derecha (50%)**: Fondo gris claro (`#f5f5f5`) que se extiende hasta el borde

### 2. Contenido del Lado Izquierdo

- Numero pequeno y limpio (no gigante)
- Titulo en negrita con punto final
- Descripcion de una o dos lineas maximo
- Link CTA azul con flecha (no boton)

### 3. Visual del Lado Derecho

- Contenedor gris redondeado
- Por ahora usaremos una tarjeta oscura con icono (mockup placeholder)
- En el futuro se pueden agregar screenshots reales del dashboard

### 4. Estructura por Paso

Cada paso ocupa el ancho completo de la pantalla, dividido en dos mitades iguales, separado por lineas horizontales.

---

## Detalles Tecnicos

### Archivo a Modificar

`src/components/landing/HowItWorksSection.tsx`

### Estructura del Componente

```tsx
// Cada paso como fila completa con dos columnas
{steps.map((step) => (
  <div className="border-b border-[#e5e5e5]">
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[400px] lg:min-h-[500px]">
      
      {/* Lado izquierdo - Contenido (fondo blanco) */}
      <div className="bg-white flex items-center px-8 lg:px-16 py-16">
        <div className="max-w-md">
          <span className="text-sm font-medium text-[#0a0a0a] mb-6 block">
            {step.number}
          </span>
          <h3 className="text-2xl lg:text-3xl font-bold text-[#0a0a0a] mb-4">
            {step.title}
          </h3>
          <p className="text-base text-[#6b7280] mb-6">
            {step.description}
          </p>
          <Link className="text-primary font-medium flex items-center gap-2 hover:gap-3">
            {step.cta} <ArrowRight />
          </Link>
        </div>
      </div>
      
      {/* Lado derecho - Visual (fondo gris) */}
      <div className="bg-[#f5f5f5] flex items-center justify-center p-8 lg:p-12">
        <div className="bg-[#1a1a1a] rounded-xl w-full max-w-lg aspect-[4/3] flex items-center justify-center">
          {/* Mockup placeholder con icono */}
          <step.icon className="w-12 h-12 text-primary" />
        </div>
      </div>
      
    </div>
  </div>
))}
```

### Datos de los Pasos Actualizados

```tsx
const steps = [
  {
    number: "1",
    title: "Upload your statements.",
    description: "Simply drag and drop your bank statements in Excel or PDF format.",
    cta: "Upload files",
    icon: Upload,
  },
  {
    number: "2", 
    title: "AI-powered analysis.",
    description: "Our intelligent system automatically categorizes every transaction and generates personalized insights.",
    cta: "See how it works",
    icon: Brain,
  },
  {
    number: "3",
    title: "Take control.",
    description: "Get crystal-clear visibility into your finances with intuitive visualizations.",
    cta: "Start for free",
    icon: Target,
  },
];
```

### Encabezado de la Seccion

Mantener el header actual pero ajustar para que siga el mismo estilo limpio:

```tsx
<div className="py-20 lg:py-28 border-b border-[#e5e5e5] bg-white">
  <div className="container px-4 md:px-6 lg:px-16">
    <p className="text-sm text-[#6b7280] uppercase tracking-wider mb-4">
      How it works
    </p>
    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#0a0a0a] leading-tight">
      From messy data to<br />
      <span className="text-[#9ca3af]">total financial clarity.</span>
    </h2>
  </div>
</div>
```

### CTA Final

Boton centrado al final de la seccion (mantener el estilo actual).

---

## Resultado Visual Esperado

1. Cada paso es una fila horizontal de ancho completo
2. Mitad izquierda blanca con texto alineado a la izquierda
3. Mitad derecha gris con mockup/visual centrado
4. Numeros pequenos y discretos (no gigantes)
5. Links CTA azules con flechas
6. Lineas divisorias sutiles entre cada paso
7. Aspecto limpio, minimalista y profesional como Autonoma

