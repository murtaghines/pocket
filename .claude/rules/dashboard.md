---
paths:
  - "src/pages/Index.tsx"
  - "src/components/dashboard/**"
---
# Dashboard
- Todo chart/KPI usa `hsl(var(--success))` / `hsl(var(--destructive))` — nunca color crudo
- Los datos del mes vienen de `useMonthSelection` + `useTransactions`, no dupliques ese estado en el componente
- `TransactionTable` y `TransactionCardList` se comparten con History — si cambiás columnas o props, revisá ese uso también
- Nuevas stat cards siguen el patrón de `StatCard.tsx` (label + KPI + sparkline, mismo token para los tres)