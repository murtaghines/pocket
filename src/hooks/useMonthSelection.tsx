import { createContext, useContext, useState, ReactNode } from "react";

interface MonthSelectionContextValue {
  selectedMonth: string | null;
  setSelectedMonth: (m: string | null) => void;
  availableMonths: string[];
  setAvailableMonths: (m: string[]) => void;
  openingBalance: number | null;
  setOpeningBalance: (b: number | null) => void;
}

const MonthSelectionContext = createContext<MonthSelectionContextValue | undefined>(undefined);

export function MonthSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [openingBalance, setOpeningBalance] = useState<number | null>(null);

  return (
    <MonthSelectionContext.Provider
      value={{ selectedMonth, setSelectedMonth, availableMonths, setAvailableMonths, openingBalance, setOpeningBalance }}
    >
      {children}
    </MonthSelectionContext.Provider>
  );
}

export function useMonthSelection() {
  const ctx = useContext(MonthSelectionContext);
  if (!ctx) {
    return {
      selectedMonth: null,
      setSelectedMonth: () => {},
      availableMonths: [],
      setAvailableMonths: () => {},
      openingBalance: null,
      setOpeningBalance: () => {},
    } as MonthSelectionContextValue;
  }
  return ctx;
}
