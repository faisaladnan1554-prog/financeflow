import { useState } from 'react';
import { User, Globe, Database, Shield, Info, Download, Upload, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { adminApi, accountsApi, categoriesApi, transactionsApi, budgetsApi, goalsApi, loansApi, creditCardsApi, recurringBillsApi, splitExpensesApi } from '../lib/api';
import { toast } from 'sonner';

const CURRENCIES = [
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { data, refreshData } = useApp();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [importing, setImporting] = useState(false);

  const handleSaveProfile = () => {
    if (!name.trim()) { toast.error('Name is required'); return; }
    updateUser({ name, email });
    toast.success('Profile updated');
  };

  // ── Export — download current MongoDB data as JSON ──────────────────────
  const handleExportData = () => {
    const exportPayload = {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      accounts: data.accounts,
      categories: data.categories,
      transactions: data.transactions,
      budgets: data.budgets,
      savingsGoals: data.savingsGoals,
      loans: data.loans,
      creditCards: data.creditCards,
      recurringBills: data.recurringBills,
      splitExpenses: data.splitExpenses,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported successfully');
  };

  // ── Import — send JSON data to API endpoints ────────────────────────────
  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setImporting(true);
        const toastId = toast.loading('Importing data…');
        try {
          const raw = JSON.parse(ev.target?.result as string);

          // Support both old localStorage format and new API format
          // Support both old localStorage format (v1) and new cloud format (v2)
          const accounts       = raw.accounts      ?? [];
          const categories     = raw.categories    ?? [];
          const transactions   = raw.transactions  ?? [];
          const budgets        = raw.budgets       ?? [];
          const savingsGoals   = raw.savingsGoals  ?? raw.goals ?? [];
          const loans          = raw.loans         ?? [];
          const creditCards    = raw.creditCards   ?? [];
          const recurringBills = raw.recurringBills ?? [];
          const splitExpenses  = raw.splitExpenses ?? [];

          let imported = 0;

          // Import accounts
          for (const a of accounts) {
            try {
              await accountsApi.create({ name: a.name, type: a.type, balance: Number(a.balance ?? 0), color: a.color ?? '#3B82F6', icon: a.icon ?? '🏦', currency: a.currency ?? 'PKR' });
              imported++;
            } catch { /* skip duplicates */ }
          }

          // Import categories (skip default ones — already exist)
          for (const c of categories) {
            if (c.isDefault) continue;
            try {
              await categoriesApi.create({ name: c.name, type: c.type, icon: c.icon ?? '📦', color: c.color ?? '#6B7280' });
              imported++;
            } catch { /* skip */ }
          }

          // Import transactions
          if (transactions.length > 0) {
            const freshAccounts = await accountsApi.getAll();
            const txPayloads = transactions.map((t: Record<string, unknown>) => ({
              type: t.type as 'income' | 'expense' | 'transfer',
              amount: Number(t.amount),
              date: t.date as string,
              category: (t.category ?? t.categoryId ?? '') as string,
              accountId: freshAccounts.find(a => a.id === t.accountId)?.id ?? freshAccounts[0]?.id ?? '',
              notes: (t.notes ?? '') as string,
            })).filter((t: { accountId: string }) => t.accountId);

            if (txPayloads.length > 0) {
              const res = await transactionsApi.import(txPayloads);
              imported += res.count;
            }
          }

          // Import budgets
          for (const b of budgets) {
            try {
              await budgetsApi.create({ categoryId: b.categoryId, monthlyLimit: Number(b.monthlyLimit ?? b.amount ?? 0), month: b.month, alertThreshold: b.alertThreshold ?? 80 });
              imported++;
            } catch { /* skip */ }
          }

          // Import savings goals
          for (const g of savingsGoals) {
            try {
              await goalsApi.create({ name: g.name, targetAmount: Number(g.targetAmount ?? 0), currentAmount: Number(g.currentAmount ?? 0), deadline: g.deadline ?? g.targetDate ?? '', priority: g.priority ?? 'medium', icon: g.icon ?? '🎯' });
              imported++;
            } catch { /* skip */ }
          }

          // Import loans
          for (const l of loans) {
            try {
              await loansApi.create({ direction: l.direction ?? l.type ?? 'given', personName: l.personName, amount: Number(l.amount ?? 0), dueDate: l.dueDate ?? '', interestRate: Number(l.interestRate ?? 0), notes: l.notes ?? l.description ?? '', status: l.status ?? 'active' });
              imported++;
            } catch { /* skip */ }
          }

          // Import credit cards
          for (const c of creditCards) {
            try {
              await creditCardsApi.create({ name: c.name, bank: c.bank ?? '', last4: c.last4 ?? '0000', creditLimit: Number(c.creditLimit ?? c.limit ?? 0), currentBalance: Number(c.currentBalance ?? c.balance ?? 0), billingDay: c.billingDay ?? 1, dueDay: c.dueDay ?? 25, color: c.color ?? '#3B82F6' });
              imported++;
            } catch { /* skip */ }
          }

          // Import recurring bills
          for (const b of recurringBills) {
            try {
              const freshAccounts2 = await accountsApi.getAll();
              await recurringBillsApi.create({ name: b.name, amount: Number(b.amount ?? 0), category: b.category ?? '', accountId: freshAccounts2[0]?.id ?? '', dueDay: b.dueDay ?? 1, frequency: b.frequency ?? 'monthly', isActive: b.isActive ?? true });
              imported++;
            } catch { /* skip */ }
          }

          // Import split expenses
          for (const s of splitExpenses) {
            try {
              const freshAccounts3 = await accountsApi.getAll();
              await splitExpensesApi.create({ title: s.title, totalAmount: Number(s.totalAmount ?? 0), date: s.date ?? '', category: s.category ?? '', accountId: freshAccounts3[0]?.id ?? '', participants: s.participants ?? [], notes: s.notes ?? '', status: s.status ?? 'active' });
              imported++;
            } catch { /* skip */ }
          }

          toast.dismiss(toastId);
          toast.success(`Imported ${imported} records successfully!`);
          await refreshData();
        } catch (err) {
          toast.dismiss(toastId);
          toast.error(err instanceof Error ? err.message : 'Invalid backup file — could not import');
        } finally {
          setImporting(false);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Clear — delete all data via API ────────────────────────────────────
  const handleClearData = async () => {
    if (!confirm('This will delete ALL your transactions, accounts, budgets and other data. This cannot be undone. Continue?')) return;
    if (!confirm('Are you absolutely sure? Everything will be deleted!')) return;
    const toastId = toast.loading('Clearing all data…');
    try {
      await adminApi.clearMyData();
      toast.dismiss(toastId);
      toast.success('All data cleared. Default categories restored.');
      await refreshData();
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to clear data');
    }
  };

  const loginTime = user?.loginTime ? new Date(user.loginTime) : null;
  const sessionDuration = loginTime ? Math.floor((Date.now() - loginTime.getTime()) / 60000) : 0;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <User size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Profile Settings</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={handleSaveProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            Save Profile
          </button>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Globe size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Preferences</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
            <select value={user?.currency ?? 'PKR'} onChange={e => updateUser({ currency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fiscal Month Start</label>
            <select value={user?.fiscalMonthStart ?? 1} onChange={e => updateUser({ fiscalMonthStart: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                <option key={d} value={d}>Day {d}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Shield size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Session & Security</h3>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Account created</span>
            <span className="text-gray-900">{user?.createdAt ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Last login</span>
            <span className="text-gray-900">{loginTime?.toLocaleDateString() ?? '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Session duration</span>
            <span className="text-gray-900">{sessionDuration} minutes</span>
          </div>
          <div className="pt-2">
            <button onClick={logout} className="text-sm text-red-600 hover:underline font-medium">
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Database size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Data Management</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-3">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900 text-base">{data.transactions.length}</p>
              <p>Transactions</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900 text-base">{data.accounts.length}</p>
              <p>Accounts</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="font-bold text-gray-900 text-base">{data.categories.length}</p>
              <p>Categories</p>
            </div>
          </div>
          <div className="space-y-2">
            <button
              onClick={handleExportData}
              className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
            >
              <Download size={14} /> Export All Data (JSON)
            </button>
            <button
              onClick={handleImportData}
              disabled={importing}
              className="w-full flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-60"
            >
              <Upload size={14} /> {importing ? 'Importing…' : 'Import Data (JSON)'}
            </button>
            <button
              onClick={handleClearData}
              className="w-full flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50"
            >
              <Trash2 size={14} /> Clear All My Data
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Import supports both old local backup files and new cloud backup files.
          </p>
        </div>
      </div>

      {/* About */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
          <Info size={16} className="text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">About</h3>
        </div>
        <div className="p-4 space-y-1 text-sm text-gray-500">
          <p>FinanceFlow v2.0.0</p>
          <p>Personal Finance Management System</p>
          <p>Data stored securely in MongoDB Atlas.</p>
          <p className="text-xs text-gray-400 mt-2">Built with React 19 + Tailwind CSS 4 + Express.js</p>
        </div>
      </div>
    </div>
  );
}
