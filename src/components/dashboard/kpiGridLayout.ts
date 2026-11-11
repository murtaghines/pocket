/**
 * Shared grid classes for the KPI row and the chart rows below it.
 * The KPI row's two halves align with the chart grid (e.g. "Weekly chart | Accounts").
 * Changing these values updates both rows everywhere.
 */

/** Outer two-column grid shared by KPI row and every chart row below it. */
export const DASHBOARD_GRID = "grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-[14px]";

/** KPI left sub-grid: Income · Expenses · Net Balance (wider for the ring). */
export const KPI_LEFT_GRID = "grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-3";

/** KPI right sub-grid: Transfers (wider) · Invested & Saved. */
export const KPI_RIGHT_GRID = "grid grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3";
