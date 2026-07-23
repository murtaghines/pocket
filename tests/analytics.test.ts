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
  spendPaceForMonth,
  transactionStatsForMonth,
  monthOverMonth,
  seasonalIndexByCalendarMonth,
  weekdaySpending,
  rollingNetByMonths,
  categoryTrends,
  historySummary,
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

  it("spendPaceForMonth returns the actual total for a fully-past month", () => {
    const pace = spendPaceForMonth(txs, "2024-03", (n) => n, new Date(2024, 5, 1));
    expect(pace.spentSoFar).toBe(150);
    expect(pace.projected).toBe(150);
    expect(pace.inProgress).toBe(false);
  });

  it("spendPaceForMonth projects a partial current month", () => {
    // As of day 10 of a 31-day month with 100 spent -> projects ~310.
    const partial = [
      tx({ date: "2024-03-02", amount: -50, movement: "EXPENSE" }),
      tx({ date: "2024-03-09", amount: -50, movement: "EXPENSE" }),
    ];
    const pace = spendPaceForMonth(partial, "2024-03", (n) => n, new Date(2024, 2, 10));
    expect(pace.spentSoFar).toBe(100);
    expect(pace.inProgress).toBe(true);
    expect(pace.projected).toBe(310);
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
