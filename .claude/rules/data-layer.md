---
paths:
  - "src/hooks/**"
  - "src/integrations/supabase/**"
  - "supabase/**"
---
# Capa de datos (transversal a todos los módulos)
- Nunca editar `src/integrations/supabase/types.ts` a mano — se regenera desde el schema
- Nunca editar una migración ya aplicada — siempre crear una nueva en `supabase/migrations/`
- Toda lógica de datos vive en un hook custom (`useX.tsx`), los componentes nunca hacen fetch directo
- Edge functions en kebab-case, una carpeta por función, lógica compartida en `_shared/`