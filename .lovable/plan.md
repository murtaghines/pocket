
# Plan de Mejoras para el Dashboard

## Resumen de Cambios

Se implementarán tres mejoras principales en el dashboard:

1. **Título del mes dinámico** - Mostrar el mes del último registro subido, no el mes actual
2. **Reorganización de KPIs** - Income, Expenses y Balance ocuparán todo el ancho horizontal
3. **Reubicación del selector de moneda** - Moverlo al lado izquierdo del header, junto a la navegación

---

## 1. Título del Mes Dinámico

### Problema Actual
El dashboard muestra "February 2026" (el mes actual), pero el usuario quiere ver el mes del último registro de datos subido.

### Solución
- Obtener el mes más reciente de los datos cargados (del array `monthlyData`)
- Si hay datos, mostrar el mes del último registro
- Cuando se sube un nuevo mes, el título se actualiza automáticamente

**Ejemplo:** Si hoy es 3 de febrero pero lo último subido es diciembre → mostrar "December 2025"

---

## 2. Reorganización de KPIs (Income, Expenses, Balance)

### Problema Actual
Los KPIs están en una grilla de 4-5 columnas incluyendo Investments, lo que los hace más pequeños.

### Solución
- **Income, Expenses, Balance**: Ocuparán todo el ancho en una fila de 3 columnas iguales
- **Investments**: Mover a una sección separada, posiblemente:
  - Como un banner debajo de los KPIs principales
  - Integrado en la fila de gráficos existente
  - Como tarjeta lateral junto al gráfico de Savings Rate

### Propuesta de Diseño
```
+------------------+------------------+------------------+
|     INCOME       |    EXPENSES      |     BALANCE      |
|    (1/3 ancho)   |   (1/3 ancho)    |   (1/3 ancho)    |
+------------------+------------------+------------------+

+----------------------------------------+---------------+
|         Monthly Balance Chart          |  Investments  |
|             (2/3 ancho)                | (sidebar card)|
+----------------------------------------+---------------+
```

---

## 3. Reubicación del Selector de Moneda

### Problema Actual
El selector de moneda está a la derecha del header, junto a las notificaciones y el avatar.

### Solución
- Mover el CurrencySelector al lado izquierdo del header
- Quedará visualmente asociado a la navegación sin estar dentro del sidebar
- El lado derecho solo tendrá: Notificaciones + Avatar

### Estructura del Header Resultante
```
+-----------------------------------------------------------+
|                          HEADER                            |
+-----------------------------------------------------------+
| [€ EUR] (izquierda)              [🔔] [Avatar] (derecha)  |
+-----------------------------------------------------------+
```

---

## Detalles Técnicos

### Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/pages/Index.tsx` | Lógica del título dinámico basado en el último mes con datos |
| `src/pages/Index.tsx` | Reorganización del grid de KPIs (3 columnas) |
| `src/pages/Index.tsx` | Mover InvestmentSummaryCard a nueva ubicación |
| `src/components/layout/DashboardLayout.tsx` | Mover CurrencySelector a la izquierda del header |

### Cambios en Index.tsx

**Título del mes:**
```tsx
// Obtener el mes del último registro de datos
const latestMonthLabel = monthlyData.length > 0 
  ? monthlyData[monthlyData.length - 1].month 
  : null;

// Renderizar
<h3 className="text-lg font-semibold mb-4 capitalize text-muted-foreground">
  {latestMonthLabel || t('period.noPeriods')}
</h3>
```

**Grid de KPIs:**
```tsx
// Antes: grid-cols-2 md:grid-cols-4 lg:grid-cols-5
// Después: grid-cols-1 md:grid-cols-3

<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
  <StatCard title="Income" ... />
  <StatCard title="Expenses" ... />
  <StatCard title="Balance" ... />
</div>
```

**Investments - Nueva ubicación:**
```tsx
// Integrar en la fila de gráficos
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
  <div className="lg:col-span-2">
    <MonthlyChart data={...} />
  </div>
  <div className="space-y-4">
    <InvestmentSummaryCard />
    <SavingsRateCard ... />
  </div>
</div>
```

### Cambios en DashboardLayout.tsx

```tsx
<header className="...">
  <div className="flex h-16 items-center justify-between px-4 md:px-6">
    {/* Izquierda: Currency Selector */}
    <div className="flex items-center">
      <div className="md:hidden w-12" /> {/* Espacio para hamburguesa en móvil */}
      <CurrencySelector variant="light" />
    </div>
    
    {/* Derecha: Notificaciones + Avatar */}
    <div className="flex items-center gap-2 md:gap-3">
      <NotificationBell variant="light" />
      <Link to="/profile">...</Link>
    </div>
  </div>
</header>
```

---

## Resultado Final

1. ✅ El título mostrará el mes del último dato subido (ej: "December 2025")
2. ✅ Income, Expenses y Balance ocuparán todo el ancho horizontal en 3 columnas iguales
3. ✅ Investments estará junto al gráfico Monthly Balance y Savings Rate
4. ✅ El selector de moneda estará a la izquierda del header, separado de las notificaciones
