---
description: Trabajar en el pipeline de imports (parsing + categorización) con chequeos de seguridad extra
allowed-tools: Read, Edit, Write, Bash, Grep, Glob
---

## Estado del epic
!`cat docs/epics/uploads-imports.md 2>/dev/null`

## Pipeline completo
excelParser.ts (Excel) / pdfjs-dist (PDF) → process-import / process-financial-file /
process-investment-file → categorizer (usa reglas de useCategorizationRules)

## Antes de tocar cualquier parte del pipeline
1. No hay tests automáticos sobre el parsing — si no tenés un archivo real de ejemplo
   del banco afectado, pedímelo antes de cambiar nada
2. Un cambio en el parser puede romper silenciosamente otros formatos de banco ya
   soportados — verificá con al menos 2 ejemplos de bancos distintos si tocás excelParser.ts
3. Cambios en categorización automática impactan apply-rules-retroactive y
   fix-categorization — revisar esos dos antes de dar por terminado un cambio en reglas
4. Cambios en el shape de datos de una edge function: verificar que MonthReviewModal
   y MonthUploadSlot sigan consumiendo el shape correcto

## Al terminar
Actualizá docs/epics/uploads-imports.md con lo que se hizo, decisiones y qué falta.