---
paths:
  - "src/pages/Investments.tsx"
  - "src/components/investments/**"
  - "src/hooks/useInvestments.tsx"
---
# Investments
- Mismo patrón de charts que Dashboard: tokens semánticos, nunca color crudo
- InvestmentsTable/InvestmentsHistory alimentan también InvestmentSummaryCard en
  Dashboard — si cambiás el shape de datos, revisar ese uso
- Los uploads de este módulo pasan por process-investment-file (ver rules/imports.md)