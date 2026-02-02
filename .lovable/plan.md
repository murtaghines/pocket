
# Plan: Redisenar cabecera de perfil al estilo DateDisplay

## Objetivo

Reemplazar el header actual de la pagina de Perfil con un componente similar al `DateDisplay` del dashboard, pero adaptado para mostrar la informacion del usuario y funcionar como un selector de tabs interactivo.

---

## Diseno Propuesto

### Estado: Tab "My Data" activo
```text
+------------+  +------------------+   +   +-------------------+  +------------+
|  (circulo  |  | Nombre Usuario   |   |   | MY UPLOADS        |  | (circulo   |
|  persona   |  | email@mail.com   |   |   |               ->  |  |  settings) |
+------------+  +------------------+   +   +-------------------+  +------------+
   gris           texto negro          |       boton azul           gris
```

### Estado: Tab "Settings" activo
```text
+------------+  +------------------+   +   +------------+  +-------------------+
|  (circulo  |  | Nombre Usuario   |   |   | (circulo   |  | SETTINGS          |
|  persona   |  | email@mail.com   |   |   |  uploads)  |  |               ->  |
+------------+  +------------------+   +   +------------+  +-------------------+
   gris           texto negro          |       gris           boton azul
```

---

## Cambios Principales

### 1. Nuevo Componente ProfileHeader

Crear `src/components/profile/ProfileHeader.tsx` con:

- **Circulo izquierdo**: Icono de persona (User) en fondo gris
- **Texto**: Nombre del usuario en grande, email debajo en gris
- **Divisor vertical**: Linea gris
- **Selectores de tab interactivos**: 
  - El tab activo aparece como boton azul redondeado con flecha
  - El tab inactivo aparece como circulo gris con icono

### 2. Comportamiento Interactivo

- Al hacer clic en el circulo gris del tab inactivo, cambia el tab activo
- El boton azul expande para mostrar el titulo de la seccion actual
- El tab que deja de estar activo se contrae a un circulo con icono

### 3. Datos y Props

```tsx
interface ProfileHeaderProps {
  currentTab: 'data' | 'settings';
  onTabChange: (tab: string) => void;
}
```

---

## Detalles Tecnicos

### Nuevo Archivo: `src/components/profile/ProfileHeader.tsx`

```tsx
// Estructura principal
<div className="flex items-center gap-4 animate-fade-in">
  {/* Circulo con icono de persona */}
  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-200 flex items-center justify-center">
    <User className="w-8 h-8 md:w-10 md:h-10 text-foreground" />
  </div>
  
  {/* Nombre y email */}
  <div className="flex flex-col">
    <span className="text-lg md:text-xl font-bold text-foreground">
      {displayName || t('profile.guest')}
    </span>
    <span className="text-sm md:text-base text-muted-foreground">
      {user?.email}
    </span>
  </div>
  
  {/* Divisor */}
  <div className="hidden md:block w-px h-10 bg-border mx-2" />
  
  {/* Tab selectors - orden dinamico basado en tab activo */}
  {currentTab === 'data' ? (
    <>
      {/* Uploads activo - boton azul expandido */}
      <Button variant="default" className="rounded-full gap-2 px-5">
        {t('tabs.data')}
        <ArrowRight className="w-4 h-4" />
      </Button>
      
      {/* Settings inactivo - circulo gris */}
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full"
        onClick={() => onTabChange('settings')}
      >
        <Settings className="w-4 h-4" />
      </Button>
    </>
  ) : (
    <>
      {/* Uploads inactivo - circulo gris */}
      <Button 
        variant="outline" 
        size="icon"
        className="rounded-full"
        onClick={() => onTabChange('data')}
      >
        <Upload className="w-4 h-4" />
      </Button>
      
      {/* Settings activo - boton azul expandido */}
      <Button variant="default" className="rounded-full gap-2 px-5">
        {t('tabs.settings')}
        <ArrowRight className="w-4 h-4" />
      </Button>
    </>
  )}
</div>
```

### Modificaciones a `src/pages/Profile.tsx`

1. Importar el nuevo componente `ProfileHeader`
2. Reemplazar el header actual (lineas 79-101) con:

```tsx
<ProfileHeader 
  currentTab={currentTab as 'data' | 'settings'}
  onTabChange={handleTabChange}
/>
```

3. Mantener los `TabsContent` tal como estan
4. Ocultar el `TabsList` existente (ya no se necesita en desktop, solo mobile lo controla desde bottom nav)

### Traducciones Necesarias

Agregar a los archivos de traduccion (`profile.json`):

```json
{
  "header": {
    "guest": "User"
  }
}
```

---

## Responsividad

### Desktop (md+)
- Layout horizontal completo con divisor y botones
- Nombre grande, email visible

### Mobile
- Se oculta el divisor y los botones de tab (ya hay bottom nav)
- Solo muestra circulo de persona, nombre y email

---

## Resultado Visual Esperado

1. Circulo gris con icono de persona a la izquierda
2. Nombre del usuario en texto grande y negrita
3. Email debajo en gris
4. Linea divisoria vertical
5. Boton azul redondeado mostrando la seccion actual (MY UPLOADS o SETTINGS)
6. Circulo gris con el icono de la otra seccion
7. Al hacer clic en el circulo gris, los roles se intercambian con animacion
