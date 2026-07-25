import { describe, it, expect } from "vitest";
import {
  monthKeyOf,
  weekOfMonth,
  dayOfWeekMon0,
  daysInMonthOf,
  mean,
  stdDev,
  coefficientOfVariation,
  classifyExpense,
  essentialSplitForMonth,
  weeklyBreakdownForMonth,
  transactionStatsForMonth,
  monthOverMonth,
  seasonalIndexByCalendarMonth,
  weekdaySpending,
  rollingNetByMonths,
  categoryTrends,
  historySummary,
  yearKeyOf,
  weekStartKeyOf,
  periodKeyOf,
  bucketByGranularity,
  formatPeriodLabel,
} from "../src/lib/analytics";
import type { MonthlyData, Transaction } from "../src/lib/mockData";

// Minimal transaction factory — only the fields the analytics functions read.
function tx(partial: Partial<Transaction> & { date: string; amount: number }): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    description: partial.description ?? "tx",
    currency: "EUR",
    type: partial.movement === "INCOME" ? "income" : partial.movement === "TRANSFER" ? "transfer" : "expense",
    category: (partial.categorySlug ?? "other_expense") as Transaction["category"],
    account: "Test",
    bank: "Test",
    ...partial,
  } as Transaction;
}

describe("date helpers", () => {
  it("monthKeyOf slices YYYY-MM without timezone drift", () => {
    expect(monthKeyOf("2024-03-05")).toBe("2024-03");
    expect(monthKeyOf("2024-12-31")).toBe("2024-12");
  });

  it("weekOfMonth buckets by day-of-month (1..5)", () => {
    expect(weekOfMonth("2024-03-01")).toBe(1);
    expect(weekOfMonth("2024-03-07")).toBe(1);
    expect(weekOfMonth("2024-03-08")).toBe(2);
    expect(weekOfMonth("2024-03-31")).toBe(5);
  });

  it("dayOfWeekMon0 returns Monday=0..Sunday=6", () => {
    // 2024-03-04 is a Monday, 2024-03-10 is a Sunday.
    expect(dayOfWeekMon0("2024-03-04")).toBe(0);
    expect(dayOfWeekMon0("2024-03-10")).toBe(6);
  });

  it("daysInMonthOf handles leap February", () => {
    expect(daysInMonthOf("2024-02")).toBe(29);
    expect(daysInMonthOf("2023-02")).toBe(28);
    expect(daysInMonthOf("2024-04")).toBe(30);
  });
});

describe("granularity period keys", () => {
  it("yearKeyOf slices the year", () => {
    expect(yearKeyOf("2024-03-05")).toBe("2024");
    expect(yearKeyOf("2023-12-31")).toBe("2023");
  });

  it("weekStartKeyOf returns the Monday of the week (tz-safe)", () => {
    // 2024-03-06 is a Wednesday -> Monday is 2024-03-04.
    expect(weekStartKeyOf("2024-03-06")).toBe("2024-03-04");
    // A Monday maps to itself.
    expect(weekStartKeyOf("2024-03-04")).toBe("2024-03-04");
    // A Sunday belongs to the week that started the previous Monday.
    expect(weekStartKeyOf("2024-03-10")).toBe("2024-03-04");
    // Crossing a month boundary: 2024-03-01 is a Friday -> Monday 2024-02-26.
    expect(weekStartKeyOf("2024-03-01")).toBe("2024-02-26");
  });

  it("periodKeyOf dispatches per granularity", () => {
    expect(periodKeyOf("2024-03-06", "year")).toBe("2024");
    expect(periodKeyOf("2024-03-06", "month")).toBe("2024-03");
    expect(periodKeyOf("2024-03-06", "week")).toBe("2024-03-04");
  });
});

describe("bucketByGranularity", () => {
  const txns: Transaction[] = [
    tx({ date: "2024-01-10", amount: 1000, movement: "INCOME", categorySlug: "salary" }),
    tx({ date: "2024-01-15", amount: -200, movement: "EXPENSE", categorySlug: "groceries" }),
    tx({ date: "2024-01-20", amount: -300, movement: "TRANSFER", categorySlug: "to_investment" }),
    tx({ date: "2024-01-25", amount: -50, movement: "TRANSFER", categorySlug: "own_transfer" }),
    tx({ date: "2024-02-10", amount: 1200, movement: "INCOME", categorySlug: "salary" }),
    tx({ date: "2024-02-12", amount: -400, movement: "EXPENSE", categorySlug: "restaurants" }),
  ];

  it("buckets by month with income/expenses/balance/sentToInvest", () => {
    const rows = bucketByGranularity(txns, "month");
    expect(rows.map((r) => r.month)).toEqual(["2024-01", "2024-02"]);
    expect(rows[0]).toMatchObject({ income: 1000, expenses: 200, balance: 800, sentToInvest: 300 });
    // The plain own_transfer is excluded from income and expenses.
    expect(rows[0].expenses).toBe(200);
    expect(rows[1]).toMatchObject({ income: 1200, expenses: 400, balance: 800 });
  });

  it("buckets by year, collapsing all months of the year", () => {
    const rows = bucketByGranularity(txns, "year");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ month: "2024", income: 2200, expenses: 600, balance: 1600, sentToInvest: 300 });
  });

  it("buckets by week keyed on the Monday of each week, sorted ascending", () => {
    const rows = bucketByGranularity(txns, "week");
    // Each transaction date maps to its own week Monday.
    expect(rows.map((r) => r.month)).toEqual([...rows.map((r) => r.month)].sort());
    const total = rows.reduce((s, r) => s + r.income - r.expenses, 0);
    expect(total).toBe(1600);
  });

  it("applies the convert function to every amount", () => {
    const rows = bucketByGranularity(txns, "year", (n) => n * 2);
    expect(rows[0]).toMatchObject({ income: 4400, expenses: 1200, sentToInvest: 600 });
  });
});

describe("formatPeriodLabel", () => {
  it("returns the year unchanged at year granularity", () => {
    expect(formatPeriodLabel("2024", "year")).toBe("2024");
  });

  it("formats a month key as a short month name", () => {
    expect(formatPeriodLabel("2024-03", "month", "en")).toBe("Mar");
  });

  it("formats a week key as a short day + month", () => {
    // Locale-dependent exact string; assert it contains the day and month token.
    const label = formatPeriodLabel("2024-03-04", "week", "en");
    expect(label).toMatch(/Mar/);
    expect(label).toMatch(/4/);
  });
});

describe("statistics", () => {
  it("mean and stdDev are defensive on empty/singleton input", () => {
    expect(mean([])).toBe(0);
    expect(stdDev([])).toBe(0);
    expect(stdDev([5])).toBe(0);
    expect(mean([2, 4, 6])).toBe(4);
  });

  it("coefficientOfVariation avoids divide-by-zero on a zero mean", () => {
    expect(coefficientOfVariation([0, 0, 0])).toBe(0);
    expect(coefficientOfVariation([10, 10, 10])).toBe(0); // no dispersion
    expect(coefficientOfVariation([1, 100])).toBeGreaterThan(0);
  });
});

describe("fixed vs discretionary", () => {
  it("classifies essential and discretionary slugs", () => {
    expect(classifyExpense("housing")).toBe("essential");
    expect(classifyExpense("groceries")).toBe("essential");
    expect(classifyExpense("restaurants")).toBe("discretionary");
    expect(classifyExpense("travel")).toBe("discretionary");
  });

  it("splits a month's expenses into the two buckets", () => {
    const txs = [
      tx({ date: "2024-03-02", amount: -100, movement: "EXPENSE", categorySlug: "housing" }),
      tx({ date: "2024-03-05", amount: -40, movement: "EXPENSE", categorySlug: "restaurants" }),
      tx({ date: "2024-03-06", amount: -60, movement: "EXPENSE", categorySlug: "travel" }),
      tx({ date: "2024-03-07", amount: 3000, movement: "INCOME", categorySlug: "salary" }),
    ];
    const split = essentialSplitForMonth(txs, "2024-03");
    expect(split.essential).toBe(100);
    expect(split.discretionary).toBe(100);
    expect(split.total).toBe(200);
    expect(split.discretionaryPct).toBe(50);
  });

  it("breaks each bucket down by category, largest first", () => {
    const txs = [
      tx({ date: "2024-03-02", amount: -100, movement: "EXPENSE", categorySlug: "housing" }),
      tx({ date: "2024-03-03", amount: -50, movement: "EXPENSE", categorySlug: "groceries" }),
      tx({ date: "2024-03-04", amount: -20, movement: "EXPENSE", categorySlug: "groceries" }),
      tx({ date: "2024-03-05", amount: -80, movement: "EXPENSE", categorySlug: "restaurants" }),
      tx({ date: "2024-03-06", amount: -40, movement: "EXPENSE", categorySlug: "shopping" }),
    ];
    const split = essentialSplitForMonth(txs, "2024-03");
    // Essential: housing 100, groceries 70 (50+20) -> housing first.
    expect(split.essentialCategories).toEqual([
      { slug: "housing", amount: 100 },
      { slug: "groceries", amount: 70 },
    ]);
    // Discretionary: restaurants 80, shopping 40.
    expect(split.discretionaryCategories).toEqual([
      { slug: "restaurants", amount: 80 },
      { slug: "shopping", amount: 40 },
    ]);
  });
});

describe("monthly aggregations", () => {
  const txs = [
    tx({ date: "2024-03-01", amount: -30, movement: "EXPENSE" }),
    tx({ date: "2024-03-08", amount: -70, movement: "EXPENSE" }),
    tx({ date: "2024-03-15", amount: -50, movement: "EXPENSE" }),
    tx({ date: "2024-03-20", amount: 2000, movement: "INCOME" }),
  ];

  it("weeklyBreakdownForMonth groups spend into weeks", () => {
    const weekly = weeklyBreakdownForMonth(txs, "2024-03");
    expect(weekly[0].spend).toBe(30); // week 1
    expect(weekly[1].spend).toBe(70); // week 2
    expect(weekly[2].spend).toBe(50); // week 3
    expect(weekly[2].income).toBe(2000);
  });

  it("transactionStatsForMonth surfaces count, avg ticket and largest", () => {
    const stats = transactionStatsForMonth(txs, "2024-03");
    expect(stats.expenseCount).toBe(3);
    expect(stats.avgTicket).toBe(50);
    expect(stats.largest?.amount).toBe(70);
    expect(stats.costliestDay?.day).toBe(8);
  });
});

describe("historical aggregations", () => {
  const monthly: MonthlyData[] = [
    { month: "2024-01", income: 3000, expenses: 2000, balance: 1000, sentToInvest: 0 },
    { month: "2024-02", income: 3000, expenses: 2500, balance: 500, sentToInvest: 0 },
    { month: "2024-03", income: 3000, expenses: 1500, balance: 1500, sentToInvest: 0 },
  ];

  it("monthOverMonth computes prev/avg deltas", () => {
    const mom = monthOverMonth(monthly);
    expect(mom[0].expensesVsPrevPct).toBeNull(); // first month has no prev
    expect(mom[1].expensesVsPrevPct).toBe(25); // 2000 -> 2500
    expect(mom[2].expensesVsPrevPct).toBe(-40); // 2500 -> 1500
  });

  it("historySummary reports totals, streak and best/worst", () => {
    const s = historySummary(monthly);
    expect(s.totalIncome).toBe(9000);
    expect(s.totalExpenses).toBe(6000);
    expect(s.totalBalance).toBe(3000);
    expect(s.bestMonth?.month).toBe("2024-03");
    expect(s.worstMonth?.month).toBe("2024-02");
    expect(s.positiveStreak).toBe(3); // all three months positive
    expect(s.savingsRate).toBe(33); // 3000/9000
  });

  it("rollingNetByMonths smooths over a window", () => {
    const rolling = rollingNetByMonths(monthly, 3);
    expect(rolling[0].rolling).toBe(1000); // just month 1
    expect(rolling[2].rolling).toBe(1000); // mean(1000,500,1500)
  });

  it("seasonalIndexByCalendarMonth places months by calendar index", () => {
    const seasonal = seasonalIndexByCalendarMonth(monthly);
    expect(seasonal).toHaveLength(12);
    expect(seasonal[0].avgExpenses).toBe(2000); // January
    expect(seasonal[0].sampleSize).toBe(1);
    expect(seasonal[5].sampleSize).toBe(0); // June has no data
  });

  it("weekdaySpending averages per distinct weekday date", () => {
    const txs = [
      tx({ date: "2024-03-04", amount: -20, movement: "EXPENSE" }), // Monday
      tx({ date: "2024-03-11", amount: -40, movement: "EXPENSE" }), // Monday
      tx({ date: "2024-03-09", amount: -100, movement: "EXPENSE" }), // Saturday
    ];
    const wd = weekdaySpending(txs);
    expect(wd[0].avgSpend).toBe(30); // (20+40)/2 distinct Mondays
    expect(wd[5].avgSpend).toBe(100); // one Saturday
  });

  it("categoryTrends keeps top-N and collapses the rest", () => {
    const txs = [
      tx({ date: "2024-01-05", amount: -100, movement: "EXPENSE", categorySlug: "housing" }),
      tx({ date: "2024-02-05", amount: -120, movement: "EXPENSE", categorySlug: "housing" }),
      tx({ date: "2024-01-06", amount: -30, movement: "EXPENSE", categorySlug: "pets" }),
    ];
    const trend = categoryTrends(txs, 1);
    expect(trend.months).toEqual(["2024-01", "2024-02"]);
    // Top-1 is housing; pets collapses into other_expense.
    const slugs = trend.series.map((s) => s.slug);
    expect(slugs).toContain("housing");
    expect(slugs).toContain("other_expense");
  });
});
