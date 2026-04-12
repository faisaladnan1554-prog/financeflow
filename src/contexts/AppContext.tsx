import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AppData, Account, Category, Transaction, Budget, SavingsGoal, RecurringTransaction, Loan, CreditCard, RecurringBill, SplitExpense, ScheduledEntry } from '../types';
import {
  accountsApi, categoriesApi, transactionsApi, budgetsApi, goalsApi,
  loansApi, creditCardsApi, recurringBillsApi, splitExpensesApi, scheduledEntriesApi,
} from '../lib/api';
import { generateId, todayISO, getCurrentMonth } from '../lib/utils';
import { toast } from 'sonner';

interface AppContextType {
  data: AppData;
  loading: boolean;
  refreshData: () => Promise<void>;
  // Accounts
  addAccount: (a: Omit<Account, 'id' | 'createdAt'>) => void;
  updateAccount: (id: string, a: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, note: string) => void;
  // Categories
  addCategory: (c: Omit<Category, 'id' | 'createdAt' | 'isDefault'>) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  // Transactions
  addTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  updateTransaction: (id: string, t: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  importTransactions: (ts: Omit<Transaction, 'id' | 'createdAt'>[]) => void;
  // Budgets
  addBudget: (b: Omit<Budget, 'id' | 'createdAt' | 'spent'>) => void;
  updateBudget: (id: string, b: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;
  // Goals
  addGoal: (g: Omit<SavingsGoal, 'id' | 'createdAt'>) => void;
  updateGoal: (id: string, g: Partial<SavingsGoal>) => void;
  deleteGoal: (id: string) => void;
  // Recurring
  addRecurring: (r: Omit<RecurringTransaction, 'id' | 'createdAt'>) => void;
  updateRecurring: (id: string, r: Partial<RecurringTransaction>) => void;
  deleteRecurring: (id: string) => void;
  // Loans
  addLoan: (l: Omit<Loan, 'id' | 'createdAt' | 'payments' | 'remainingAmount'>) => void;
  updateLoan: (id: string, l: Partial<Loan>) => void;
  deleteLoan: (id: string) => void;
  recordLoanPayment: (loanId: string, amount: number, notes: string) => void;
  // Credit Cards
  addCreditCard: (c: Omit<CreditCard, 'id' | 'createdAt'>) => void;
  updateCreditCard: (id: string, c: Partial<CreditCard>) => void;
  deleteCreditCard: (id: string) => void;
  // Bills
  addBill: (b: Omit<RecurringBill, 'id' | 'createdAt' | 'payments'>) => void;
  updateBill: (id: string, b: Partial<RecurringBill>) => void;
  deleteBill: (id: string) => void;
  markBillPaid: (billId: string, amount: number) => void;
  // Splits
  addSplit: (s: Omit<SplitExpense, 'id' | 'createdAt'>) => void;
  updateSplit: (id: string, s: Partial<SplitExpense>) => void;
  deleteSplit: (id: string) => void;
  markParticipantPaid: (splitId: string, participantId: string) => void;
  // Scheduled Entries
  addScheduledEntry: (e: Omit<ScheduledEntry, 'id' | 'createdAt' | 'status' | 'transactionId'>) => Promise<void>;
  updateScheduledEntry: (id: string, e: Partial<ScheduledEntry>) => Promise<void>;
  deleteScheduledEntry: (id: string) => Promise<void>;
  // Utils
  getMonthlyBudgetSpent: (categoryId: string, month: string) => number;
}

const EMPTY_DATA: AppData = {
  users: [], accounts: [], categories: [], transactions: [],
  budgets: [], savingsGoals: [], recurringTransactions: [],
  loans: [], creditCards: [], recurringBills: [], splitExpenses: [],
  scheduledEntries: [],
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  // ── Fetch all data from API ──────────────────────────────────────────────
  const refreshData = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-apply any pending scheduled entries that are due (silent)
      scheduledEntriesApi.apply().catch(() => {});

      const [accounts, categories, transactions, budgets, savingsGoals, loans, creditCards, recurringBills, splitExpenses, scheduledEntries] =
        await Promise.all([
          accountsApi.getAll(),
          categoriesApi.getAll(),
          transactionsApi.getAll(),
          budgetsApi.getAll(),
          goalsApi.getAll(),
          loansApi.getAll(),
          creditCardsApi.getAll(),
          recurringBillsApi.getAll(),
          splitExpensesApi.getAll(),
          // Graceful fallback — returns [] if backend route not yet deployed
          scheduledEntriesApi.getAll().catch(() => [] as import('../types').ScheduledEntry[]),
        ]);
      setData(prev => ({ ...prev, accounts, categories, transactions, budgets, savingsGoals, loans, creditCards, recurringBills, splitExpenses, scheduledEntries }));
    } catch (err) {
      toast.error('Failed to load data from server');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // ── Optimistic update helper ─────────────────────────────────────────────
  function optimisticAdd<K extends keyof AppData>(
    key: K,
    tempItem: AppData[K][number],
    apiCall: () => Promise<AppData[K][number]>,
    tempId: string
  ) {
    setData(prev => ({ ...prev, [key]: [...(prev[key] as unknown[]), tempItem] }));
    apiCall()
      .then(saved => setData(prev => ({
        ...prev,
        [key]: (prev[key] as { id: string }[]).map(i => i.id === tempId ? saved : i),
      })))
      .catch(() => {
        toast.error('Save failed — check your connection');
        setData(prev => ({ ...prev, [key]: (prev[key] as { id: string }[]).filter(i => i.id !== tempId) }));
      });
  }

  function optimisticUpdate<K extends keyof AppData>(
    key: K,
    id: string,
    patch: Partial<AppData[K][number]>,
    apiCall: () => Promise<AppData[K][number]>,
    prevItem: AppData[K][number]
  ) {
    setData(prev => ({
      ...prev,
      [key]: (prev[key] as { id: string }[]).map(i => i.id === id ? { ...i, ...patch } : i),
    }));
    apiCall()
      .then(saved => setData(prev => ({
        ...prev,
        [key]: (prev[key] as { id: string }[]).map(i => i.id === id ? saved : i),
      })))
      .catch(() => {
        toast.error('Update failed');
        setData(prev => ({
          ...prev,
          [key]: (prev[key] as { id: string }[]).map(i => i.id === id ? prevItem : i),
        }));
      });
  }

  function optimisticDelete<K extends keyof AppData>(
    key: K,
    id: string,
    apiCall: () => Promise<unknown>,
    removed: AppData[K][number]
  ) {
    setData(prev => ({ ...prev, [key]: (prev[key] as { id: string }[]).filter(i => i.id !== id) }));
    apiCall().catch(() => {
      toast.error('Delete failed');
      setData(prev => ({ ...prev, [key]: [...(prev[key] as unknown[]), removed] }));
    });
  }

  // ── Accounts ─────────────────────────────────────────────────────────────
  const addAccount = (a: Omit<Account, 'id' | 'createdAt'>) => {
    const tempId = generateId();
    const temp: Account = { ...a, id: tempId, createdAt: todayISO() };
    optimisticAdd('accounts', temp, () => accountsApi.create(a), tempId);
  };

  const updateAccount = (id: string, a: Partial<Account>) => {
    const prev = data.accounts.find(x => x.id === id)!;
    optimisticUpdate('accounts', id, a, () => accountsApi.update(id, a), prev);
  };

  const deleteAccount = (id: string) => {
    const removed = data.accounts.find(x => x.id === id)!;
    optimisticDelete('accounts', id, () => accountsApi.delete(id), removed);
  };

  const transferBetweenAccounts = (fromId: string, toId: string, amount: number, note: string) => {
    accountsApi.transfer(fromId, toId, amount, note).then(res => {
      setData(prev => ({
        ...prev,
        accounts: res.accounts,
        transactions: [res.transaction, ...prev.transactions],
      }));
    }).catch(() => toast.error('Transfer failed'));
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const addCategory = (c: Omit<Category, 'id' | 'createdAt' | 'isDefault'>) => {
    const tempId = generateId();
    const temp: Category = { ...c, id: tempId, isDefault: false, createdAt: todayISO() };
    optimisticAdd('categories', temp, () => categoriesApi.create(c), tempId);
  };

  const updateCategory = (id: string, c: Partial<Category>) => {
    const prev = data.categories.find(x => x.id === id)!;
    optimisticUpdate('categories', id, c, () => categoriesApi.update(id, c), prev);
  };

  const deleteCategory = (id: string) => {
    const removed = data.categories.find(x => x.id === id)!;
    optimisticDelete('categories', id, () => categoriesApi.delete(id), removed);
  };

  // ── Transactions ──────────────────────────────────────────────────────────
  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    const tempId = generateId();
    const temp: Transaction = { ...t, id: tempId, createdAt: todayISO() };
    // Optimistic balance adjustment
    setData(prev => {
      const accounts = prev.accounts.map(a => {
        if (a.id !== t.accountId) return a;
        return { ...a, balance: a.balance + (t.type === 'income' ? t.amount : -t.amount) };
      });
      return { ...prev, transactions: [temp, ...prev.transactions], accounts };
    });
    transactionsApi.create(t)
      .then(saved => {
        setData(prev => ({
          ...prev,
          transactions: prev.transactions.map(tx => tx.id === tempId ? saved : tx),
        }));
        // Refresh accounts + budgets from server for accuracy
        Promise.all([accountsApi.getAll(), budgetsApi.getAll()]).then(([accounts, budgets]) => {
          setData(prev => ({ ...prev, accounts, budgets }));
        });
      })
      .catch(() => {
        toast.error('Transaction save failed');
        setData(prev => ({
          ...prev,
          transactions: prev.transactions.filter(tx => tx.id !== tempId),
          accounts: prev.accounts.map(a => {
            if (a.id !== t.accountId) return a;
            return { ...a, balance: a.balance - (t.type === 'income' ? t.amount : -t.amount) };
          }),
        }));
      });
  };

  const updateTransaction = (id: string, t: Partial<Transaction>) => {
    const old = data.transactions.find(x => x.id === id)!;
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx => tx.id === id ? { ...tx, ...t } : tx),
    }));
    transactionsApi.update(id, t)
      .then(() => {
        // Refresh accounts + budgets for accuracy after update
        Promise.all([accountsApi.getAll(), budgetsApi.getAll()]).then(([accounts, budgets]) => {
          setData(prev => ({ ...prev, accounts, budgets }));
        });
      })
      .catch(() => {
        toast.error('Update failed');
        setData(prev => ({ ...prev, transactions: prev.transactions.map(tx => tx.id === id ? old : tx) }));
      });
  };

  const deleteTransaction = (id: string) => {
    const tx = data.transactions.find(x => x.id === id)!;
    setData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== id),
      accounts: prev.accounts.map(a => {
        if (a.id !== tx.accountId) return a;
        return { ...a, balance: a.balance - (tx.type === 'income' ? tx.amount : -tx.amount) };
      }),
    }));
    transactionsApi.delete(id)
      .then(() => {
        Promise.all([accountsApi.getAll(), budgetsApi.getAll()]).then(([accounts, budgets]) => {
          setData(prev => ({ ...prev, accounts, budgets }));
        });
      })
      .catch(() => {
        toast.error('Delete failed');
        setData(prev => ({ ...prev, transactions: [...prev.transactions, tx] }));
      });
  };

  const importTransactions = (ts: Omit<Transaction, 'id' | 'createdAt'>[]) => {
    transactionsApi.import(ts).then(res => {
      setData(prev => ({ ...prev, transactions: [...res.transactions, ...prev.transactions] }));
      Promise.all([accountsApi.getAll(), budgetsApi.getAll()]).then(([accounts, budgets]) => {
        setData(prev => ({ ...prev, accounts, budgets }));
      });
    }).catch(() => toast.error('Import failed'));
  };

  // ── Budgets ───────────────────────────────────────────────────────────────
  const addBudget = (b: Omit<Budget, 'id' | 'createdAt' | 'spent'>) => {
    const tempId = generateId();
    const temp: Budget = { ...b, id: tempId, spent: 0, createdAt: todayISO() };
    optimisticAdd('budgets', temp, () => budgetsApi.create(b), tempId);
  };

  const updateBudget = (id: string, b: Partial<Budget>) => {
    const prev = data.budgets.find(x => x.id === id)!;
    optimisticUpdate('budgets', id, b, () => budgetsApi.update(id, b), prev);
  };

  const deleteBudget = (id: string) => {
    const removed = data.budgets.find(x => x.id === id)!;
    optimisticDelete('budgets', id, () => budgetsApi.delete(id), removed);
  };

  // ── Goals ─────────────────────────────────────────────────────────────────
  const addGoal = (g: Omit<SavingsGoal, 'id' | 'createdAt'>) => {
    const tempId = generateId();
    const temp: SavingsGoal = { ...g, id: tempId, createdAt: todayISO() };
    optimisticAdd('savingsGoals', temp, () => goalsApi.create(g), tempId);
  };

  const updateGoal = (id: string, g: Partial<SavingsGoal>) => {
    const prev = data.savingsGoals.find(x => x.id === id)!;
    optimisticUpdate('savingsGoals', id, g, () => goalsApi.update(id, g), prev);
  };

  const deleteGoal = (id: string) => {
    const removed = data.savingsGoals.find(x => x.id === id)!;
    optimisticDelete('savingsGoals', id, () => goalsApi.delete(id), removed);
  };

  // ── Recurring (local only — no separate API yet) ───────────────────────
  const addRecurring = (r: Omit<RecurringTransaction, 'id' | 'createdAt'>) =>
    setData(prev => ({ ...prev, recurringTransactions: [...prev.recurringTransactions, { ...r, id: generateId(), createdAt: todayISO() }] }));

  const updateRecurring = (id: string, r: Partial<RecurringTransaction>) =>
    setData(prev => ({ ...prev, recurringTransactions: prev.recurringTransactions.map(rt => rt.id === id ? { ...rt, ...r } : rt) }));

  const deleteRecurring = (id: string) =>
    setData(prev => ({ ...prev, recurringTransactions: prev.recurringTransactions.filter(r => r.id !== id) }));

  // ── Loans ─────────────────────────────────────────────────────────────────
  const addLoan = (l: Omit<Loan, 'id' | 'createdAt' | 'payments' | 'remainingAmount'>) => {
    const tempId = generateId();
    const temp: Loan = { ...l, id: tempId, remainingAmount: l.amount, payments: [], createdAt: todayISO() };
    optimisticAdd('loans', temp, () => loansApi.create(l), tempId);
  };

  const updateLoan = (id: string, l: Partial<Loan>) => {
    const prev = data.loans.find(x => x.id === id)!;
    optimisticUpdate('loans', id, l, () => loansApi.update(id, l), prev);
  };

  const deleteLoan = (id: string) => {
    const removed = data.loans.find(x => x.id === id)!;
    optimisticDelete('loans', id, () => loansApi.delete(id), removed);
  };

  const recordLoanPayment = (loanId: string, amount: number, notes: string) => {
    loansApi.recordPayment(loanId, amount, notes).then(saved => {
      setData(prev => ({ ...prev, loans: prev.loans.map(l => l.id === loanId ? saved : l) }));
    }).catch(() => toast.error('Payment record failed'));
  };

  // ── Credit Cards ──────────────────────────────────────────────────────────
  const addCreditCard = (c: Omit<CreditCard, 'id' | 'createdAt'>) => {
    const tempId = generateId();
    const temp: CreditCard = { ...c, id: tempId, createdAt: todayISO() };
    optimisticAdd('creditCards', temp, () => creditCardsApi.create(c), tempId);
  };

  const updateCreditCard = (id: string, c: Partial<CreditCard>) => {
    const prev = data.creditCards.find(x => x.id === id)!;
    optimisticUpdate('creditCards', id, c, () => creditCardsApi.update(id, c), prev);
  };

  const deleteCreditCard = (id: string) => {
    const removed = data.creditCards.find(x => x.id === id)!;
    optimisticDelete('creditCards', id, () => creditCardsApi.delete(id), removed);
  };

  // ── Recurring Bills ───────────────────────────────────────────────────────
  const addBill = (b: Omit<RecurringBill, 'id' | 'createdAt' | 'payments'>) => {
    const tempId = generateId();
    const temp: RecurringBill = { ...b, id: tempId, payments: [], createdAt: todayISO() };
    optimisticAdd('recurringBills', temp, () => recurringBillsApi.create(b), tempId);
  };

  const updateBill = (id: string, b: Partial<RecurringBill>) => {
    const prev = data.recurringBills.find(x => x.id === id)!;
    optimisticUpdate('recurringBills', id, b, () => recurringBillsApi.update(id, b), prev);
  };

  const deleteBill = (id: string) => {
    const removed = data.recurringBills.find(x => x.id === id)!;
    optimisticDelete('recurringBills', id, () => recurringBillsApi.delete(id), removed);
  };

  const markBillPaid = (billId: string, amount: number) => {
    const month = getCurrentMonth();
    recurringBillsApi.markPaid(billId, amount, month).then(saved => {
      setData(prev => ({ ...prev, recurringBills: prev.recurringBills.map(b => b.id === billId ? saved : b) }));
    }).catch(() => toast.error('Mark paid failed'));
  };

  // ── Split Expenses ────────────────────────────────────────────────────────
  const addSplit = (s: Omit<SplitExpense, 'id' | 'createdAt'>) => {
    const tempId = generateId();
    const temp: SplitExpense = { ...s, id: tempId, createdAt: todayISO() };
    optimisticAdd('splitExpenses', temp, () => splitExpensesApi.create(s), tempId);
  };

  const updateSplit = (id: string, s: Partial<SplitExpense>) => {
    const prev = data.splitExpenses.find(x => x.id === id)!;
    optimisticUpdate('splitExpenses', id, s, () => splitExpensesApi.update(id, s), prev);
  };

  const deleteSplit = (id: string) => {
    const removed = data.splitExpenses.find(x => x.id === id)!;
    optimisticDelete('splitExpenses', id, () => splitExpensesApi.delete(id), removed);
  };

  const markParticipantPaid = (splitId: string, participantId: string) => {
    splitExpensesApi.markParticipantPaid(splitId, participantId).then(saved => {
      setData(prev => ({ ...prev, splitExpenses: prev.splitExpenses.map(s => s.id === splitId ? saved : s) }));
    }).catch(() => toast.error('Mark paid failed'));
  };

  // ── Scheduled Entries ─────────────────────────────────────────────────────
  const addScheduledEntry = async (e: Omit<ScheduledEntry, 'id' | 'createdAt' | 'status' | 'transactionId'>) => {
    try {
      const saved = await scheduledEntriesApi.create(e);
      setData(prev => ({ ...prev, scheduledEntries: [...prev.scheduledEntries, saved] }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save entry';
      toast.error(msg);
      throw err; // re-throw so page can react
    }
  };

  const updateScheduledEntry = async (id: string, e: Partial<ScheduledEntry>) => {
    try {
      const saved = await scheduledEntriesApi.update(id, e);
      setData(prev => ({ ...prev, scheduledEntries: prev.scheduledEntries.map(x => x.id === id ? saved : x) }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update entry';
      toast.error(msg);
    }
  };

  const deleteScheduledEntry = async (id: string) => {
    setData(prev => ({ ...prev, scheduledEntries: prev.scheduledEntries.filter(x => x.id !== id) }));
    try {
      await scheduledEntriesApi.delete(id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete entry';
      toast.error(msg);
      // reload to restore the deleted item
      scheduledEntriesApi.getAll().then(scheduledEntries =>
        setData(prev => ({ ...prev, scheduledEntries }))
      ).catch(() => {});
    }
  };

  // ── Util ──────────────────────────────────────────────────────────────────
  const getMonthlyBudgetSpent = (categoryId: string, month: string): number =>
    data.transactions
      .filter(t => t.type === 'expense' && t.category === categoryId && t.date.startsWith(month))
      .reduce((sum, t) => sum + t.amount, 0);

  return (
    <AppContext.Provider value={{
      data, loading, refreshData,
      addAccount, updateAccount, deleteAccount, transferBetweenAccounts,
      addCategory, updateCategory, deleteCategory,
      addTransaction, updateTransaction, deleteTransaction, importTransactions,
      addBudget, updateBudget, deleteBudget,
      addGoal, updateGoal, deleteGoal,
      addRecurring, updateRecurring, deleteRecurring,
      addLoan, updateLoan, deleteLoan, recordLoanPayment,
      addCreditCard, updateCreditCard, deleteCreditCard,
      addBill, updateBill, deleteBill, markBillPaid,
      addSplit, updateSplit, deleteSplit, markParticipantPaid,
      addScheduledEntry, updateScheduledEntry, deleteScheduledEntry,
      getMonthlyBudgetSpent,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
