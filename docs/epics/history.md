# Epic: History

## Main files
- src/components/dashboard/HistoryTab.tsx (rendered inside Dashboard.tsx as `?tab=history`)
- Shares TransactionTable / TransactionCardList with the other dashboard tabs
  (check both usages if you change anything there)
- Hooks: useTransactions

## Current state
History is no longer a standalone page — it's a tab within the Dashboard
(`/dashboard?tab=history`). The old `/history` and `/total` routes redirect there.
`History.tsx` page file was removed; the tab component is `HistoryTab.tsx`.

## Decisions made
- 2026-09-10: consolidated History into Dashboard as a sub-tab in the navigation restructure

## Next step
