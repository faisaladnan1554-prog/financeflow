import type { AppData, Category } from '../types';
import { generateId, todayISO } from './utils';

const STORAGE_KEY = 'financeflow_data';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: '💼', color: '#10B981', isDefault: true, createdAt: todayISO() },
  { id: 'cat_freelance', name: 'Freelance', type: 'income', icon: '💻', color: '#3B82F6', isDefault: true, createdAt: todayISO() },
  { id: 'cat_business', name: 'Business', type: 'income', icon: '🏢', color: '#8B5CF6', isDefault: true, createdAt: todayISO() },
  { id: 'cat_investment', name: 'Investment', type: 'income', icon: '📈', color: '#F59E0B', isDefault: true, createdAt: todayISO() },
  { id: 'cat_gift', name: 'Gift', type: 'income', icon: '🎁', color: '#EC4899', isDefault: true, createdAt: todayISO() },
  { id: 'cat_other_income', name: 'Other Income', type: 'income', icon: '💰', color: '#06B6D4', isDefault: true, createdAt: todayISO() },
  { id: 'cat_food', name: 'Food & Dining', type: 'expense', icon: '🍔', color: '#EF4444', isDefault: true, createdAt: todayISO() },
  { id: 'cat_transport', name: 'Transport', type: 'expense', icon: '🚗', color: '#F97316', isDefault: true, createdAt: todayISO() },
  { id: 'cat_rent', name: 'Rent & Housing', type: 'expense', icon: '🏠', color: '#EAB308', isDefault: true, createdAt: todayISO() },
  { id: 'cat_utilities', name: 'Utilities', type: 'expense', icon: '💡', color: '#84CC16', isDefault: true, createdAt: todayISO() },
  { id: 'cat_health', name: 'Health & Medical', type: 'expense', icon: '🏥', color: '#14B8A6', isDefault: true, createdAt: todayISO() },
  { id: 'cat_education', name: 'Education', type: 'expense', icon: '📚', color: '#6366F1', isDefault: true, createdAt: todayISO() },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: '🎬', color: '#A855F7', isDefault: true, createdAt: todayISO() },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: '🛍️', color: '#F43F5E', isDefault: true, createdAt: todayISO() },
  { id: 'cat_travel', name: 'Travel', type: 'expense', icon: '✈️', color: '#0EA5E9', isDefault: true, createdAt: todayISO() },
  { id: 'cat_other_expense', name: 'Other Expense', type: 'expense', icon: '📦', color: '#6B7280', isDefault: true, createdAt: todayISO() },
];

const DEFAULT_DATA: AppData = {
  users: [
    {
      id: 'demo_user',
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'demo123',
      createdAt: '2024-01-01',
      currency: 'PKR',
      language: 'en',
      fiscalMonthStart: 1,
    },
  ],
  accounts: [
    { id: generateId(), name: 'Cash', type: 'cash', balance: 5000, currency: 'PKR', icon: '💵', color: '#10B981', createdAt: todayISO() },
    { id: generateId(), name: 'Bank Account', type: 'checking', balance: 150000, currency: 'PKR', icon: '🏦', color: '#2563EB', createdAt: todayISO() },
    { id: generateId(), name: 'Savings', type: 'savings', balance: 75000, currency: 'PKR', icon: '🏺', color: '#8B5CF6', createdAt: todayISO() },
  ],
  categories: DEFAULT_CATEGORIES,
  transactions: [],
  budgets: [],
  savingsGoals: [],
  recurringTransactions: [],
  loans: [],
  creditCards: [],
  recurringBills: [],
  splitExpenses: [],
  scheduledEntries: [],
};

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw) as Partial<AppData>;
    return {
      ...DEFAULT_DATA,
      ...parsed,
      categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
    };
  } catch {
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function exportData(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `financeflow_backup_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(jsonString: string): AppData {
  const parsed = JSON.parse(jsonString) as Partial<AppData>;
  return {
    ...DEFAULT_DATA,
    ...parsed,
  };
}
