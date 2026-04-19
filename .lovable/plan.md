

## Análisis honesto de qué se puede y qué no

**Lo que SÍ tenemos en datos** (tablas `accounts` + `transactions`):
- `accounts.name` → nombre que el usuario le puso a la cuenta (ej: "BBVA Principal")
- `accounts.institution` → banco (ej: "BBVA", "Santander") — opcional
- `accounts.currency_base` → moneda
- `transactions.account_id` → cada transacción está ligada a una cuenta
- `transactions.running_balance` → saldo después de cada movimiento (cuando el resumen lo trae)
- Lógica de **opening balance** ya implementada en `useTransactions` que calcula saldo del mes por banco/cuenta

**Lo que NO tenemos y NO se puede inferir de los resúmenes**:
- ❌ Marca de tarjeta (VISA / Mastercard / Amex)
- ❌ Fecha de vencimiento (04/24, 09/26, etc.)
- ❌ Últimos 4 dígitos `**** 9090` — los resúmenes a veces lo traen en la descripción de la transacción, pero no de forma estructurada por cuenta
- ❌ Una cuenta puede tener N tarjetas o todo puede ser por transferencia → no hay forma fiable de mapear "tarjeta → balance"

**Conclusión**: hacer "tarjetas tipo VISA" como las imágenes de referencia sería **inventar datos**. No lo recomiendo. Pero sí podemos hacer algo que **se inspire en esa estética** y muestre información real: el **balance actual por cuenta bancaria**, no por tarjeta.

## Propuesta: "Accounts Stack" al lado del Weekly Flow

Una columna a la derecha del Weekly Flow con **mini-cards apiladas**, una por cuenta CASH, mostrando el balance actual del último mes (saldo final = opening balance del mes + flujo neto del mes para esa cuenta, usando la lógica de `running_balance` que ya existe).

### Diseño visual (inspirado en las imágenes pero honesto)

```text
┌──────────────────────────────────────┬─────────────────────┐
│  Weekly Flow                         │  Accounts           │
│  ┌────────────────────────────────┐  │  ┌───────────────┐  │
│  │     gráfico W1 W2 W3 W4        │  │  │ ● BBVA        │  │
│  │                                │  │  │ Principal     │  │
│  │                                │  │  │ €12.430,55    │  │
│  └────────────────────────────────┘  │  │ EUR · current │  │
│                                       │  └───────────────┘  │
│                                       │  ┌───────────────┐  │
│                                       │  │ ● Santander   │  │
│                                       │  │ €3.210,00     │  │
│                                       │  └───────────────┘  │
│                                       │  + Add account     │
└──────────────────────────────────────┴─────────────────────┘
```

Cada mini-card:
- **Color de marca**: usamos el azul brand `#1b76ff` para una, amarillo brand `#ffd027` para otra, alternando — coherente con la identidad Pocket. NO inventamos VISA/Mastercard.
- **Header**: nombre de la cuenta + institución (si existe)
- **Balance grande**: saldo calculado al final del último mes con datos
- **Footer sutil**: moneda y "current balance" — sin fecha falsa de vencimiento, sin **** 1234 inventado
- **Esquina decorativa**: un círculo translúcido tipo las imágenes para mantener la estética
- Si hay más de 3 cuentas → scroll vertical interno

### Estructura técnica

**1. Nuevo componente** `src/components/dashboard/AccountsStackCard.tsx`
- Props: `transactions`, `monthKey`, `convert`, `formatCurrency`
- Usa `useAccounts()` para listar cuentas CASH
- Para cada cuenta calcula: `opening_balance(mes) + Σ(transacciones del mes en esa cuenta)`
- Si no hay `running_balance` para una cuenta → muestra solo el flujo neto del mes con label "Net flow" en vez de "Balance" (transparencia con el usuario)
- Empty state limpio si no hay cuentas

**2. Layout en `src/pages/Index.tsx`**
- Cambiar la sección "Weekly Flow" de `mb-4` simple a un grid:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 mb-4">
  <DailyFlowChart ... />
  <AccountsStackCard ... />
</div>
```
- En mobile se apilan; en desktop la columna de cuentas es fija ~320px.

**3. Estilo de mini-cards**
- Border radius `rounded-2xl`, sombra suave consistente con el resto del dashboard
- Alternancia de colores brand (azul → amarillo → blanco con border azul) para diferenciar visualmente cuentas sin inventar marcas
- Tipografía: nombre `text-sm font-medium`, balance `text-2xl font-bold tabular-nums`

### Lo que NO vamos a hacer (para ser honestos contigo)

- ❌ Mostrar logos de VISA/Mastercard
- ❌ Mostrar `**** 1234` salvo que el usuario lo haya escrito en el nombre de la cuenta
- ❌ Mostrar fechas de vencimiento
- ❌ Pretender que las cuentas son tarjetas físicas

### Alcance

- 1 archivo nuevo (`AccountsStackCard.tsx`)
- 1 archivo editado (`Index.tsx` — solo el wrapper del grid)
- Sin cambios de DB, sin migraciones

