import type {
  User, Account, Category, Transaction, Budget, SavingsGoal,
  Loan, CreditCard, RecurringBill, SplitExpense
} from '../types';

// In production (Netlify drag-and-drop), set VITE_API_URL to your Render backend URL.
// e.g. https://financeflow-api.onrender.com/api
// In local dev it falls back to /api (proxied by Vite to localhost:5000).
const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

// ── Token helpers ──────────────────────────────────────────────────────────
const TOKEN_KEY = 'ff_jwt_token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// ── Core fetch helper ──────────────────────────────────────────────────────
async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({ error: 'Invalid response' }));

  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    req<{ token: string; user: User }>('POST', '/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    req<{ token: string; user: User }>('POST', '/auth/register', { name, email, password }),

  me: () => req<User>('GET', '/auth/me'),

  updateProfile: (data: Partial<User>) =>
    req<User>('PUT', '/auth/profile', data),
};

// ── Accounts ───────────────────────────────────────────────────────────────
export const accountsApi = {
  getAll: () => req<Account[]>('GET', '/accounts'),
  create: (data: Omit<Account, 'id' | 'createdAt'>) => req<Account>('POST', '/accounts', data),
  update: (id: string, data: Partial<Account>) => req<Account>('PUT', `/accounts/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/accounts/${id}`),
  transfer: (fromId: string, toId: string, amount: number, note: string) =>
    req<{ accounts: Account[]; transaction: Transaction }>('POST', '/accounts/transfer', { fromId, toId, amount, note }),
};

// ── Transactions ───────────────────────────────────────────────────────────
export const transactionsApi = {
  getAll: () => req<Transaction[]>('GET', '/transactions'),
  create: (data: Omit<Transaction, 'id' | 'createdAt'>) => req<Transaction>('POST', '/transactions', data),
  update: (id: string, data: Partial<Transaction>) => req<Transaction>('PUT', `/transactions/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/transactions/${id}`),
  import: (transactions: Omit<Transaction, 'id' | 'createdAt'>[]) =>
    req<{ count: number; transactions: Transaction[] }>('POST', '/transactions/import', { transactions }),
};

// ── Categories ─────────────────────────────────────────────────────────────
export const categoriesApi = {
  getAll: () => req<Category[]>('GET', '/categories'),
  create: (data: Omit<Category, 'id' | 'createdAt' | 'isDefault'>) => req<Category>('POST', '/categories', data),
  update: (id: string, data: Partial<Category>) => req<Category>('PUT', `/categories/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/categories/${id}`),
};

// ── Budgets ────────────────────────────────────────────────────────────────
export const budgetsApi = {
  getAll: () => req<Budget[]>('GET', '/budgets'),
  create: (data: Omit<Budget, 'id' | 'createdAt' | 'spent'>) => req<Budget>('POST', '/budgets', data),
  update: (id: string, data: Partial<Budget>) => req<Budget>('PUT', `/budgets/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/budgets/${id}`),
};

// ── Savings Goals ──────────────────────────────────────────────────────────
export const goalsApi = {
  getAll: () => req<SavingsGoal[]>('GET', '/goals'),
  create: (data: Omit<SavingsGoal, 'id' | 'createdAt'>) => req<SavingsGoal>('POST', '/goals', data),
  update: (id: string, data: Partial<SavingsGoal>) => req<SavingsGoal>('PUT', `/goals/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/goals/${id}`),
};

// ── Loans ──────────────────────────────────────────────────────────────────
export const loansApi = {
  getAll: () => req<Loan[]>('GET', '/loans'),
  create: (data: Omit<Loan, 'id' | 'createdAt' | 'payments' | 'remainingAmount'>) => req<Loan>('POST', '/loans', data),
  update: (id: string, data: Partial<Loan>) => req<Loan>('PUT', `/loans/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/loans/${id}`),
  recordPayment: (id: string, amount: number, notes: string) =>
    req<Loan>('POST', `/loans/${id}/payment`, { amount, notes }),
};

// ── Credit Cards ───────────────────────────────────────────────────────────
export const creditCardsApi = {
  getAll: () => req<CreditCard[]>('GET', '/credit-cards'),
  create: (data: Omit<CreditCard, 'id' | 'createdAt'>) => req<CreditCard>('POST', '/credit-cards', data),
  update: (id: string, data: Partial<CreditCard>) => req<CreditCard>('PUT', `/credit-cards/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/credit-cards/${id}`),
};

// ── Recurring Bills ────────────────────────────────────────────────────────
export const recurringBillsApi = {
  getAll: () => req<RecurringBill[]>('GET', '/recurring-bills'),
  create: (data: Omit<RecurringBill, 'id' | 'createdAt' | 'payments'>) => req<RecurringBill>('POST', '/recurring-bills', data),
  update: (id: string, data: Partial<RecurringBill>) => req<RecurringBill>('PUT', `/recurring-bills/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/recurring-bills/${id}`),
  markPaid: (id: string, amount: number, month: string) =>
    req<RecurringBill>('POST', `/recurring-bills/${id}/pay`, { amount, month }),
};

// ── Admin — User Management ────────────────────────────────────────────────
export const adminApi = {
  getUsers: () => req<User[]>('GET', '/admin/users'),
  createUser: (data: { name: string; email: string; password: string; currency?: string }) =>
    req<User>('POST', '/admin/users', data),
  updateUser: (id: string, data: { name?: string; email?: string; password?: string; currency?: string }) =>
    req<User>('PUT', `/admin/users/${id}`, data),
  deleteUser: (id: string) => req<{ success: boolean }>('DELETE', `/admin/users/${id}`),
  clearMyData: () => req<{ success: boolean }>('DELETE', '/admin/data/clear'),
};

// ── Split Expenses ─────────────────────────────────────────────────────────
export const splitExpensesApi = {
  getAll: () => req<SplitExpense[]>('GET', '/split-expenses'),
  create: (data: Omit<SplitExpense, 'id' | 'createdAt'>) => req<SplitExpense>('POST', '/split-expenses', data),
  update: (id: string, data: Partial<SplitExpense>) => req<SplitExpense>('PUT', `/split-expenses/${id}`, data),
  delete: (id: string) => req<{ success: boolean }>('DELETE', `/split-expenses/${id}`),
  markParticipantPaid: (id: string, participantId: string) =>
    req<SplitExpense>('POST', `/split-expenses/${id}/participant/${participantId}/pay`, {}),
};
