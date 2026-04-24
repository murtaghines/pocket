import type { Database } from "@/integrations/supabase/types";

type MovementType = Database["public"]["Enums"]["movement_type"];

export type Category = 
  | 'food' 
  | 'transport' 
  | 'housing' 
  | 'subscriptions' 
  | 'leisure' 
  | 'health' 
  | 'education' 
  | 'travel' 
  | 'other'
  | 'income'
  | 'transfer'
  | 'investment'
  // Income categories
  | 'salary'
  | 'refunds'
  | 'transfers'
  | 'other_income'
  | 'freelance'
  | 'rents'
  // Expense categories
  | 'groceries'
  | 'restaurants'
  | 'entertainment'
  | 'shopping'
  | 'sports'
  | 'other_expense'
  | 'pets'
  // Transfer categories
  | 'own_transfer'
  | 'to_investment';

export type TransactionType = 'income' | 'expense' | 'transfer';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  movement?: MovementType | null;
  category: Category;
  categorySlug?: string;
  account: string;
  bank: string;
  runningBalance?: number | null;
  userCorrected?: boolean;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export const categoryLabels: Partial<Record<Category, string>> = {
  food: 'Food',
  transport: 'Transport',
  housing: 'Housing',
  subscriptions: 'Subscriptions',
  leisure: 'Leisure',
  health: 'Health',
  education: 'Education',
  travel: 'Travel',
  other: 'Other',
  income: 'Income',
  transfer: 'Transfer',
  investment: 'Investment',
  // New slugs
  salary: 'Salary',
  refunds: 'Refunds',
  transfers: 'Transfers',
  other_income: 'Other Income',
  groceries: 'Groceries',
  restaurants: 'Restaurants',
  shopping: 'Shopping',
  own_transfer: 'Own Transfer',
  to_investment: 'To Investment',
};

export const categoryColors: Partial<Record<Category, string>> = {
  // Income categories
  salary: 'hsl(142, 76%, 36%)',
  refunds: 'hsl(199, 89%, 48%)',
  other_income: 'hsl(160, 60%, 45%)',
  investment: 'hsl(262, 83%, 58%)',
  freelance: 'hsl(280, 65%, 60%)',
  rents: 'hsl(45, 93%, 47%)',
  // Expense categories
  housing: 'hsl(25, 95%, 53%)',
  groceries: 'hsl(142, 71%, 45%)',
  restaurants: 'hsl(12, 76%, 61%)',
  transport: 'hsl(217, 91%, 60%)',
  health: 'hsl(340, 82%, 52%)',
  entertainment: 'hsl(280, 87%, 65%)',
  shopping: 'hsl(326, 78%, 60%)',
  education: 'hsl(199, 89%, 48%)',
  subscriptions: 'hsl(262, 83%, 58%)',
  travel: 'hsl(45, 93%, 47%)',
  sports: 'hsl(174, 72%, 40%)',
  other_expense: 'hsl(220, 9%, 46%)',
  pets: 'hsl(32, 95%, 44%)',
  // Transfer categories
  own_transfer: 'hsl(220, 14%, 50%)',
  to_investment: 'hsl(262, 83%, 58%)',
  // Legacy mappings for backward compatibility
  food: 'hsl(142, 71%, 45%)',
  leisure: 'hsl(280, 87%, 65%)',
  other: 'hsl(220, 9%, 46%)',
  income: 'hsl(142, 76%, 36%)',
  transfer: 'hsl(220, 14%, 50%)',
};

export const banks = [
  { id: 'revolut', name: 'Revolut', color: '#000000' },
  { id: 'santander', name: 'Santander', color: '#EC0000' },
  { id: 'bbva', name: 'BBVA', color: '#004481' },
  { id: 'caixabank', name: 'CaixaBank', color: '#007EAE' },
];

export const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-12-28', description: 'December Salary', amount: 2850.00, currency: 'EUR', type: 'income', category: 'income', account: 'Main Account', bank: 'Santander' },
  { id: '2', date: '2024-12-27', description: 'Grocery Store', amount: -87.43, currency: 'EUR', type: 'expense', category: 'food', account: 'Main Account', bank: 'Santander' },
  { id: '3', date: '2024-12-26', description: 'Netflix', amount: -17.99, currency: 'EUR', type: 'expense', category: 'subscriptions', account: 'Revolut Card', bank: 'Revolut' },
  { id: '4', date: '2024-12-25', description: 'Restaurant Dinner', amount: -65.00, currency: 'EUR', type: 'expense', category: 'leisure', account: 'BBVA Card', bank: 'BBVA' },
  { id: '5', date: '2024-12-24', description: 'Gas Station', amount: -52.30, currency: 'EUR', type: 'expense', category: 'transport', account: 'Main Account', bank: 'Santander' },
  { id: '6', date: '2024-12-23', description: 'December Rent', amount: -950.00, currency: 'EUR', type: 'expense', category: 'housing', account: 'Main Account', bank: 'Santander' },
  { id: '7', date: '2024-12-22', description: 'Spotify Premium', amount: -11.99, currency: 'EUR', type: 'expense', category: 'subscriptions', account: 'Revolut Card', bank: 'Revolut' },
  { id: '8', date: '2024-12-21', description: 'Pharmacy', amount: -23.50, currency: 'EUR', type: 'expense', category: 'health', account: 'BBVA Card', bank: 'BBVA' },
  { id: '9', date: '2024-12-20', description: 'Uber', amount: -15.80, currency: 'EUR', type: 'expense', category: 'transport', account: 'Revolut Card', bank: 'Revolut' },
  { id: '10', date: '2024-12-19', description: 'Amazon Prime', amount: -49.90, currency: 'EUR', type: 'expense', category: 'subscriptions', account: 'BBVA Card', bank: 'BBVA' },
  { id: '11', date: '2024-12-18', description: 'Udemy Course', amount: -12.99, currency: 'EUR', type: 'expense', category: 'education', account: 'Revolut Card', bank: 'Revolut' },
  { id: '12', date: '2024-12-17', description: 'Movie Theater', amount: -24.00, currency: 'EUR', type: 'expense', category: 'leisure', account: 'BBVA Card', bank: 'BBVA' },
  { id: '13', date: '2024-12-16', description: 'Freelance Project', amount: 450.00, currency: 'EUR', type: 'income', category: 'income', account: 'Main Account', bank: 'Santander' },
  { id: '14', date: '2024-12-15', description: 'Flight Booking', amount: -89.00, currency: 'EUR', type: 'expense', category: 'travel', account: 'Revolut Card', bank: 'Revolut' },
  { id: '15', date: '2024-12-14', description: 'Grocery Store', amount: -45.67, currency: 'EUR', type: 'expense', category: 'food', account: 'Main Account', bank: 'Santander' },
  { id: '16', date: '2024-12-13', description: 'Electricity Bill', amount: -78.50, currency: 'EUR', type: 'expense', category: 'housing', account: 'Main Account', bank: 'Santander' },
  { id: '17', date: '2024-12-12', description: 'Gym Membership', amount: -29.90, currency: 'EUR', type: 'expense', category: 'health', account: 'Revolut Card', bank: 'Revolut' },
  { id: '18', date: '2024-12-11', description: 'Department Store', amount: -156.00, currency: 'EUR', type: 'expense', category: 'other', account: 'BBVA Card', bank: 'BBVA' },
  { id: '19', date: '2024-12-10', description: 'Supermarket', amount: -92.30, currency: 'EUR', type: 'expense', category: 'food', account: 'Main Account', bank: 'Santander' },
  { id: '20', date: '2024-12-09', description: 'Dividends', amount: 125.00, currency: 'EUR', type: 'income', category: 'income', account: 'Investment Account', bank: 'BBVA' },
];

export const mockMonthlyData: MonthlyData[] = [
  { month: 'Jan', income: 2850, expenses: 1890, balance: 960 },
  { month: 'Feb', income: 2850, expenses: 2100, balance: 750 },
  { month: 'Mar', income: 3200, expenses: 1950, balance: 1250 },
  { month: 'Apr', income: 2850, expenses: 2300, balance: 550 },
  { month: 'May', income: 2850, expenses: 1780, balance: 1070 },
  { month: 'Jun', income: 3500, expenses: 2450, balance: 1050 },
  { month: 'Jul', income: 2850, expenses: 2800, balance: 50 },
  { month: 'Aug', income: 2850, expenses: 2100, balance: 750 },
  { month: 'Sep', income: 2850, expenses: 1900, balance: 950 },
  { month: 'Oct', income: 3100, expenses: 2200, balance: 900 },
  { month: 'Nov', income: 2850, expenses: 1850, balance: 1000 },
  { month: 'Dec', income: 3425, expenses: 1802, balance: 1623 },
];

export const getCategoryExpenses = (transactions: Transaction[]) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const categoryTotals: Record<string, number> = {};
  
  expenses.forEach(t => {
    const absAmount = Math.abs(t.amount);
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + absAmount;
  });
  
  return Object.entries(categoryTotals).map(([category, value]) => ({
    name: categoryLabels[category as Category],
    value: Math.round(value * 100) / 100,
    category: category as Category,
    color: categoryColors[category as Category],
  }));
};

export const getBankExpenses = (transactions: Transaction[]) => {
  const expenses = transactions.filter(t => t.type === 'expense');
  const bankTotals: Record<string, number> = {};
  
  expenses.forEach(t => {
    const absAmount = Math.abs(t.amount);
    bankTotals[t.bank] = (bankTotals[t.bank] || 0) + absAmount;
  });
  
  return Object.entries(bankTotals).map(([bank, value]) => ({
    name: bank,
    value: Math.round(value * 100) / 100,
  }));
};

export const getMonthSummary = (transactions: Transaction[]) => {
  const income = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const expenses = Math.abs(transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0));
  
  return {
    income,
    expenses,
    balance: income - expenses,
  };
};
