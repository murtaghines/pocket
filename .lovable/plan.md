

## Plan: Diferenciar visualmente las secciones de usuario vs uploads

### Objetivo
Crear una distinción visual clara entre:
- **Secciones de usuario/configuración**: Personal Information, Regional Settings, Categories (columna izquierda)
- **Secciones de datos/uploads**: Monthly Uploads, Investment Uploads (columna derecha)

### Cambios a implementar

#### 1. Agregar nueva variante de Card para secciones de usuario

**Archivo:** `src/components/ui/card.tsx`

Agregar una nueva variante llamada `settings` al sistema de variantes existente:

```typescript
settings: "bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-sm hover:shadow-md"
```

Esta variante usa un gradiente muy sutil del color primario (violeta/lila de fint) que:
- Da identidad de marca sin ser invasivo
- Mantiene excelente legibilidad del texto
- Funciona bien en modo claro y oscuro
- Es consistente con las variantes existentes (income, expense)

#### 2. Aplicar la variante a los componentes de usuario

**Archivo:** `src/components/profile/ProfileInfoCard.tsx`
- Cambiar `<Card>` a `<Card variant="settings">`

**Archivo:** `src/components/settings/PreferencesForm.tsx`
- Cambiar `<Card>` a `<Card variant="settings">`

**Archivo:** `src/components/settings/CategoriesEditor.tsx`
- Cambiar `<Card>` a `<Card variant="settings">`

#### 3. Mantener las cards de uploads sin cambios

Los componentes `MonthlyUploadsOrganizer` e `InvestmentUploadsOrganizer` seguirán usando la variante `default` (fondo blanco), creando el contraste deseado.

### Resultado visual esperado

| Sección | Estilo |
|---------|--------|
| Personal Information | Fondo lila muy sutil con borde violeta tenue |
| Regional Settings | Fondo lila muy sutil con borde violeta tenue |
| Categories | Fondo lila muy sutil con borde violeta tenue |
| Monthly Uploads | Fondo blanco (sin cambios) |
| Investment Uploads | Fondo blanco (sin cambios) |

### Archivos a modificar
1. `src/components/ui/card.tsx` - Agregar variante `settings`
2. `src/components/profile/ProfileInfoCard.tsx` - Usar nueva variante
3. `src/components/settings/PreferencesForm.tsx` - Usar nueva variante
4. `src/components/settings/CategoriesEditor.tsx` - Usar nueva variante

