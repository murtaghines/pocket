---
paths:
  - "src/pages/MyData.tsx"
  - "src/pages/Profile.tsx"
  - "src/hooks/useImports.tsx"
  - "src/hooks/useMonthlyFileUpload.tsx"
  - "src/hooks/useMonthlyInvestmentUpload.tsx"
  - "src/lib/excelParser.ts"
  - "supabase/functions/process-import/**"
  - "supabase/functions/process-financial-file/**"
  - "supabase/functions/process-investment-file/**"
  - "supabase/functions/_shared/categorizer.ts"
---
# Uploads & imports — módulo sensible
- No hay tests automáticos sobre el parsing. Antes de tocar la lógica de extracción,
  pedir un archivo real de ejemplo si no se tiene uno a mano
- El pipeline es: excelParser.ts (o pdfjs para PDF) → process-import/process-financial-file
  → categorizer. No saltear pasos ni fusionarlos sin avisar
- Cambios en categorización automática: revisar que no rompan `apply-rules-retroactive`
  ni `fix-categorization`, que dependen de la misma lógica