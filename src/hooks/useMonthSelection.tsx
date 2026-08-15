// Back-compat re-export: the real implementation generalized to week/month/year in
// `usePeriodSelection.tsx`. Kept so month-scoped call sites don't need to change their imports.
export { useMonthSelection } from "./usePeriodSelection";
