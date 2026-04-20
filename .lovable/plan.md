

## Plan: Color personalizable + Cuenta Principal

### Resumen
Permitir que cada cuenta tenga un **color asignado** (editable por el usuario desde una paleta curada) y marcar una **cuenta principal** que se posicione siempre primera en el stack del dashboard.

### Cambios

**1. Base de datos (`accounts`)**
Migración para agregar dos columnas:
- `color` (text, nullable) — guarda el código hex del color elegido (ej. `#1b76ff`).
- `is_primary` (boolean, default `false`) — marca la cuenta predeterminada. Trigger que garantice **una sola cuenta principal por usuario** (al marcar una nueva, se desmarcan las demás).

**2. Paleta centralizada (`src/lib/accountColors.ts`)**
Nuevo archivo que exporta la paleta organizada en dos filas (degradado azules + degradado amarillos/mostazas), respetando estrictamente la gama actual aprobada:
```text
Azules   → #cde7f7 · #a9d4f5 · #1b76ff · #155fd6 · #0a2a5e
Neutros  → #b8c4d6 · #7a8499
Amarillos→ #fff1a8 · #f5d76e · #ffd027 · #cfa83a
```
Incluye helpers: `getAccountColorStyle(hex)` que devuelve `{ bg, text, sub, circle }` calculando contraste automático (texto blanco si el color es oscuro, oscuro si es claro), y `getDefaultAccountColor(index)` para asignar uno cuando la cuenta aún no tiene color guardado.

**3. Hook `useAccounts.tsx`**
- Extender la interfaz `Account` con `color: string | null` e `is_primary: boolean`.
- Agregar mutaciones `updateAccountColor({ id, color })` y `setPrimaryAccount(id)`.

**4. AccountsManager (Profile/Settings)**
Cada fila de cuenta gana dos controles nuevos:
- **Swatch de color** clicable (círculo del color actual) → abre un Popover con la paleta organizada en dos filas (azules arriba, amarillos abajo). Click en un swatch guarda el color.
- **Estrella ⭐ (Star/StarOff de lucide)** → toggle "Cuenta principal". Solo una puede estar activa; al marcar una nueva, la anterior se desmarca automáticamente vía trigger DB.
- Badge "Principal" junto al nombre cuando aplica.

**5. AccountsStackCard (Dashboard)**
- Reemplazar el array `VARIANTS` indexado por posición por `getAccountColorStyle(account.color ?? defaultColor)`.
- En el ordenamiento `accountsData`: la cuenta `is_primary` siempre va **primera**, después se aplica el orden por selectionOrder (LRU) para el resto.
- En el sheet "View all", cada item muestra también su color real.

**6. i18n (en/es/pt — `profile.json`)**
Nuevas claves: `accounts.color`, `accounts.changeColor`, `accounts.setPrimary`, `accounts.primary`, `accounts.primaryBadge`.

### Detalles técnicos

**Cuenta principal en el stack**: cuando hay una `is_primary = true`, se inserta al inicio de `orderedAccounts` antes del LRU. Si el usuario hace click en otra cuenta, esa va a posición 2 (no desplaza a la principal). Esto da una "ancla" estable.

**Contraste automático**: función `isLightColor(hex)` calcula luminancia relativa; colores con luminancia > 0.6 usan texto oscuro (`#1a1a1a`), el resto texto blanco. Evita hardcodear text/sub/circle por color.

**Migración de cuentas existentes**: las que no tengan `color` seguirán usando el color por defecto basado en su orden de creación (mismo comportamiento actual hasta que el usuario edite).

**Constraint de única principal**: trigger `BEFORE INSERT OR UPDATE` en `accounts` que, si `NEW.is_primary = true`, ejecuta `UPDATE accounts SET is_primary = false WHERE user_id = NEW.user_id AND id != NEW.id`.

### Archivos
- **Nuevo**: `supabase/migrations/<timestamp>_account_color_primary.sql`
- **Nuevo**: `src/lib/accountColors.ts`
- **Editado**: `src/hooks/useAccounts.tsx`
- **Editado**: `src/components/settings/AccountsManager.tsx`
- **Editado**: `src/components/dashboard/AccountsStackCard.tsx`
- **Editados**: `src/i18n/locales/{en,es,pt}/profile.json`

