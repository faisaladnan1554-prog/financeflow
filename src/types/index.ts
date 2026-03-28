export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  createdAt: string;
  loginTime?: string;
  currency: string;
  language: string;
  fiscalMonthStart: number;
  plan?: 'free' | 'basic' | 'pro' | 'enterprise';
  planExpiry?: string;
  aiProvider?: 'openai' | 'anthropic';
  hasApiKey?: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  limits: { accounts: number; transactionsPerMonth: number; aiAccess: boolean };
  popular?: boolean;
}

export interface AIStrategy {
  healthScore: number;
  healthLabel: string;
  healthColor: string;
  bankruptcyRisk: 'low' | 'medium' | 'high' | 'critical';
  bankruptcyRiskLabel: string;
  savingsRate: number;
  monthsToFreedom: number;
  freedomDate: string;
  monthlyTarget: number;
  motivationalMessage: string;
  summary: string;
  budgetRecommendations: Array<{ category: string; current: number; recommended: number; action: string }>;
  actionItems: Array<{ priority: string; title: string; description: string; impact: string }>;
  projections: Array<{ month: string; income: number; expenses: number; savings: number; cumulative: number }>;
}

export interface Account {
  id: string;
  name: string;
  type: 'cash' | 'checking' | 'savings' | 'mobile_wallet' | 'investment';
  balance: number;
  currency: string;
  icon: string;
  color: string;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  date: string;
  category: string;
  accountId: string;
  toAccountId?: string;
  notes: string;
  attachment?: string;
  recurring?: { frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'; endDate?: string };
  createdAt: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  spent: number;
  month: string;
  alertThreshold: number;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  icon: string;
  createdAt: string;
}

export interface RecurringTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  nextDueDate: string;
  notes: string;
  isActive: boolean;
  createdAt: string;
}

export interface Loan {
  id: string;
  direction: 'given' | 'taken';
  personName: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
  interestRate: number;
  status: 'active' | 'settled';
  notes: string;
  payments: LoanPayment[];
  createdAt: string;
}

export interface LoanPayment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  last4: string;
  creditLimit: number;
  currentBalance: number;
  billingDay: number;
  dueDay: number;
  color: string;
  createdAt: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  category: string;
  accountId: string;
  dueDay: number;
  frequency: 'monthly' | 'quarterly' | 'yearly';
  isActive: boolean;
  payments: BillPayment[];
  createdAt: string;
}

export interface BillPayment {
  id: string;
  amount: number;
  date: string;
  month: string;
}

export interface SplitExpense {
  id: string;
  title: string;
  totalAmount: number;
  date: string;
  category: string;
  accountId: string;
  participants: SplitParticipant[];
  notes: string;
  status: 'active' | 'settled';
  createdAt: string;
}

export interface SplitParticipant {
  id: string;
  name: string;
  amount: number;
  isPaid: boolean;
  paidDate?: string;
}

export interface AppData {
  users: User[];
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  recurringTransactions: RecurringTransaction[];
  loans: Loan[];
  creditCards: CreditCard[];
  recurringBills: RecurringBill[];
  splitExpenses: SplitExpense[];
}
