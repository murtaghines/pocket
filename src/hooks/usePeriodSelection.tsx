import { createContext, useContext, useState, ReactNode } from "react";
import type { Granularity } from "@/lib/analytics";

interface PeriodSelectionContextValue {
  selectedPeriod: Record<Granularity, string | null>;
  setSelectedPeriod: (g: Granularity, key: string | null) => void;
  availablePeriods: Record<Granularity, string[]>;
  setAvailablePeriods: (g: Granularity, keys: string[]) => void;
  openingBalance: number | null;
  setOpeningBalance: (b: number | null) => void;
  transactionCount: number | null;
  setTransactionCount: (n: number | null) => void;
}

const EMPTY_SELECTED: Record<Granularity, string | null> = { week: null, month: null, year: null };
const EMPTY_AVAILABLE: Record<Granularity, string[]> = { week: [], month: [], year: [] };

const PeriodSelectionContext = createContext<PeriodSelectionContextValue | undefined>(undefined);

/**
 * App-wide "which period is selected" state, keyed by granularity (week/month/year), so the
 * Dashboard's month/week/year tabs and their header selectors share one context instead of three
 * near-duplicate ones. `openingBalance` stays a single value — it's a month-only concept.
 */
export function PeriodSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedPeriod, setSelectedPeriodState] = useState<Record<Granularity, string | null>>(EMPTY_SELECTED);
  const [availablePeriods, setAvailablePeriodsState] = useState<Record<Granularity, string[]>>(EMPTY_AVAILABLE);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);
  const [transactionCount, setTransactionCount] = useState<number | null>(null);

  const setSelectedPeriod = (g: Granularity, key: string | null) =>
    setSelectedPeriodState((prev) => (prev[g] === key ? prev : { ...prev, [g]: key }));

  const setAvailablePeriods = (g: Granularity, keys: string[]) =>
    setAvailablePeriodsState((prev) => ({ ...prev, [g]: keys }));

  return (
    <PeriodSelectionContext.Provider
      value={{
        selectedPeriod,
        setSelectedPeriod,
        availablePeriods,
        setAvailablePeriods,
        openingBalance,
        setOpeningBalance,
        transactionCount,
        setTransactionCount,
      }}
    >
      {children}
    </PeriodSelectionContext.Provider>
  );
}

export function usePeriodSelection(): PeriodSelectionContextValue {
  const ctx = useContext(PeriodSelectionContext);
  if (!ctx) {
    return {
      selectedPeriod: EMPTY_SELECTED,
      setSelectedPeriod: () => {},
      availablePeriods: EMPTY_AVAILABLE,
      setAvailablePeriods: () => {},
      openingBalance: null,
      setOpeningBalance: () => {},
      transactionCount: null,
      setTransactionCount: () => {},
    };
  }
  return ctx;
}

/**
 * Back-compat shim exposing the old month-only `useMonthSelection` shape on top of
 * `usePeriodSelection`, so month-scoped call sites don't need to change.
 */
export function useMonthSelection() {
  const { selectedPeriod, setSelectedPeriod, availablePeriods, setAvailablePeriods, openingBalance, setOpeningBalance, transactionCount, setTransactionCount } =
    usePeriodSelection();
  return {
    selectedMonth: selectedPeriod.month,
    setSelectedMonth: (m: string | null) => setSelectedPeriod("month", m),
    availableMonths: availablePeriods.month,
    setAvailableMonths: (m: string[]) => setAvailablePeriods("month", m),
    openingBalance,
    setOpeningBalance,
    transactionCount,
    setTransactionCount,
  };
}
