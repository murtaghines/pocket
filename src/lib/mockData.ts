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
  | 'income';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  category: Category;
  account: string;
  bank: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export const categoryLabels: Record<Category, string> = {
  food: 'Alimentación',
  transport: 'Transporte',
  housing: 'Vivienda',
  subscriptions: 'Suscripciones',
  leisure: 'Ocio',
  health: 'Salud',
  education: 'Educación',
  travel: 'Viajes',
  other: 'Otros',
  income: 'Ingreso',
};

export const categoryColors: Record<Category, string> = {
  food: 'hsl(25, 95%, 53%)',
  transport: 'hsl(217, 91%, 60%)',
  housing: 'hsl(262, 83%, 58%)',
  subscriptions: 'hsl(326, 78%, 60%)',
  leisure: 'hsl(47, 96%, 53%)',
  health: 'hsl(160, 84%, 39%)',
  education: 'hsl(199, 89%, 48%)',
  travel: 'hsl(280, 87%, 65%)',
  other: 'hsl(220, 9%, 46%)',
  income: 'hsl(160, 84%, 45%)',
};

export const banks = [
  { id: 'revolut', name: 'Revolut', color: '#000000' },
  { id: 'santander', name: 'Santander', color: '#EC0000' },
  { id: 'bbva', name: 'BBVA', color: '#004481' },
  { id: 'caixabank', name: 'CaixaBank', color: '#007EAE' },
];

export const mockTransactions: Transaction[] = [
  { id: '1', date: '2024-12-28', description: 'Nómina Diciembre', amount: 2850.00, currency: 'EUR', type: 'income', category: 'income', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '2', date: '2024-12-27', description: 'Supermercado Mercadona', amount: -87.43, currency: 'EUR', type: 'expense', category: 'food', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '3', date: '2024-12-26', description: 'Netflix', amount: -17.99, currency: 'EUR', type: 'expense', category: 'subscriptions', account: 'Tarjeta Revolut', bank: 'Revolut' },
  { id: '4', date: '2024-12-25', description: 'Restaurante La Barraca', amount: -65.00, currency: 'EUR', type: 'expense', category: 'leisure', account: 'Tarjeta BBVA', bank: 'BBVA' },
  { id: '5', date: '2024-12-24', description: 'Gasolina Repsol', amount: -52.30, currency: 'EUR', type: 'expense', category: 'transport', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '6', date: '2024-12-23', description: 'Alquiler Diciembre', amount: -950.00, currency: 'EUR', type: 'expense', category: 'housing', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '7', date: '2024-12-22', description: 'Spotify Premium', amount: -11.99, currency: 'EUR', type: 'expense', category: 'subscriptions', account: 'Tarjeta Revolut', bank: 'Revolut' },
  { id: '8', date: '2024-12-21', description: 'Farmacia', amount: -23.50, currency: 'EUR', type: 'expense', category: 'health', account: 'Tarjeta BBVA', bank: 'BBVA' },
  { id: '9', date: '2024-12-20', description: 'Uber', amount: -15.80, currency: 'EUR', type: 'expense', category: 'transport', account: 'Tarjeta Revolut', bank: 'Revolut' },
  { id: '10', date: '2024-12-19', description: 'Amazon Prime', amount: -49.90, currency: 'EUR', type: 'expense', category: 'subscriptions', account: 'Tarjeta BBVA', bank: 'BBVA' },
  { id: '11', date: '2024-12-18', description: 'Curso Udemy', amount: -12.99, currency: 'EUR', type: 'expense', category: 'education', account: 'Tarjeta Revolut', bank: 'Revolut' },
  { id: '12', date: '2024-12-17', description: 'Cine Yelmo', amount: -24.00, currency: 'EUR', type: 'expense', category: 'leisure', account: 'Tarjeta BBVA', bank: 'BBVA' },
  { id: '13', date: '2024-12-16', description: 'Freelance Project', amount: 450.00, currency: 'EUR', type: 'income', category: 'income', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '14', date: '2024-12-15', description: 'Vuelo Madrid-Barcelona', amount: -89.00, currency: 'EUR', type: 'expense', category: 'travel', account: 'Tarjeta Revolut', bank: 'Revolut' },
  { id: '15', date: '2024-12-14', description: 'Lidl', amount: -45.67, currency: 'EUR', type: 'expense', category: 'food', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '16', date: '2024-12-13', description: 'Luz Diciembre', amount: -78.50, currency: 'EUR', type: 'expense', category: 'housing', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '17', date: '2024-12-12', description: 'Gimnasio McFit', amount: -29.90, currency: 'EUR', type: 'expense', category: 'health', account: 'Tarjeta Revolut', bank: 'Revolut' },
  { id: '18', date: '2024-12-11', description: 'El Corte Inglés', amount: -156.00, currency: 'EUR', type: 'expense', category: 'other', account: 'Tarjeta BBVA', bank: 'BBVA' },
  { id: '19', date: '2024-12-10', description: 'Carrefour', amount: -92.30, currency: 'EUR', type: 'expense', category: 'food', account: 'Cuenta Principal', bank: 'Santander' },
  { id: '20', date: '2024-12-09', description: 'Dividendos', amount: 125.00, currency: 'EUR', type: 'income', category: 'income', account: 'Cuenta Inversiones', bank: 'BBVA' },
];

export const mockMonthlyData: MonthlyData[] = [
  { month: 'Ene', income: 2850, expenses: 1890, balance: 960 },
  { month: 'Feb', income: 2850, expenses: 2100, balance: 750 },
  { month: 'Mar', income: 3200, expenses: 1950, balance: 1250 },
  { month: 'Abr', income: 2850, expenses: 2300, balance: 550 },
  { month: 'May', income: 2850, expenses: 1780, balance: 1070 },
  { month: 'Jun', income: 3500, expenses: 2450, balance: 1050 },
  { month: 'Jul', income: 2850, expenses: 2800, balance: 50 },
  { month: 'Ago', income: 2850, expenses: 2100, balance: 750 },
  { month: 'Sep', income: 2850, expenses: 1900, balance: 950 },
  { month: 'Oct', income: 3100, expenses: 2200, balance: 900 },
  { month: 'Nov', income: 2850, expenses: 1850, balance: 1000 },
  { month: 'Dic', income: 3425, expenses: 1802, balance: 1623 },
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
