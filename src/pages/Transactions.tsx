import { useState, useMemo, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, todayISO } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { parseCSV } from '../lib/csvImport';
import type { Transaction } from '../types';
import { toast } from 'sonner';

interface TxForm {
  type: 'income' | 'expense';
  amount: string;
  date: string;
  category: string;
  accountId: string;
  notes: string;
}

const emptyForm = (): TxForm => ({
  type: 'expense', amount: '', date: todayISO(), category: '', accountId: '', notes: '',
});

const PAGE_SIZE = 20;

export default function Transactions() {
  const { data, addTransaction, updateTransaction, deleteTransaction, importTransactions } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [form, setForm] = useState<TxForm>(emptyForm());
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<{ transactions: Transaction[]; errors: string[]; total: number; success: number } | null>(null);
  const [importAccountId, setImportAccountId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const expenseCategories = data.categories.filter(c => c.type === 'expense');
  const incomeCategories = data.categories.filter(c => c.type === 'income');
  const relevantCategories = form.type === 'income' ? incomeCategories : expenseCategories;

  const filtered = useMemo(() => {
    return data.transactions
      .filter(tx => {
        if (filterType !== 'all' && tx.type !== filterType) return false;
        if (filterCategory && tx.category !== filterCategory) return false;
        if (filterAccount && tx.accountId !== filterAccount) return false;
        if (filterMonth && !tx.date.startsWith(filterMonth)) return false;
        if (search) {
          const q = search.toLowerCase();
          const cat = data.categories.find(c => c.id === tx.category);
          if (!tx.notes.toLowerCase().includes(q) && !(cat?.name.toLowerCase().includes(q))) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.transactions, data.categories, filterType, filterCategory, filterAccount, filterMonth, search]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm(), accountId: data.accounts[0]?.id ?? '' });
    setShowModal(true);
  };

  const openEdit = (tx: Transaction) => {
    setEditing(tx);
    setForm({ type: tx.type as 'income' | 'expense', amount: String(tx.amount), date: tx.date, category: tx.category, accountId: tx.accountId, notes: tx.notes });
    setShowModal(true);
  };

  const handleSave = () => {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.accountId) { toast.error('Select an account'); return; }
    if (!form.category) { toast.error('Select a category'); return; }

    const payload = { type: form.type, amount, date: form.date, category: form.category, accountId: form.accountId, notes: form.notes };
    if (editing) {
      updateTransaction(editing.id, payload);
      toast.success('Transaction updated');
    } else {
      addTransaction(payload);
      toast.success('Transaction added');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this transaction?')) {
      deleteTransaction(id);
      toast.success('Transaction deleted');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const accId = importAccountId || (data.accounts[0]?.id ?? '');
      const result = parseCSV(text, accId);
      setImportResult(result as any);
    };
    reader.readAsText(file);
  };

  const confirmImport = () => {
    if (!importResult) return;
    importTransactions(importResult.transactions.map(t => ({
      type: t.type, amount: t.amount, date: t.date, category: t.category,
      accountId: importAccountId || (data.accounts[0]?.id ?? ''), notes: t.notes,
    })));
    toast.success(`Imported ${importResult.success} transactions`);
    setShowImport(false);
    setImportResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasFilters = filterType !== 'all' || filterCategory || filterAccount || filterMonth || search;

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Transactions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-48 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search transactions..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterType} onChange={e => { setFilterType(e.target.value as any); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All categories</option>
            {data.categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          <select value={filterAccount} onChange={e => { setFilterAccount(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All accounts</option>
            {data.accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
          </select>
          <input type="month" value={filterMonth} onChange={e => { setFilterMonth(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {hasFilters && (
            <button onClick={() => { setSearch(''); setFilterType('all'); setFilterCategory(''); setFilterAccount(''); setFilterMonth(''); setPage(1); }}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-2">
              <X size={14} /> Clear
            </button>
          )}
        </div>
        <div className="flex gap-4 text-xs text-gray-500">
          <span>{filtered.length} transactions</span>
          <span className="text-green-600">Income: {formatCurrency(totalIncome, currency)}</span>
          <span className="text-red-600">Expense: {formatCurrency(totalExpense, currency)}</span>
          <span className="text-blue-600">Net: {formatCurrency(totalIncome - totalExpense, currency)}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {paged.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-sm">No transactions found</p>
            <button onClick={openAdd} className="mt-2 text-blue-600 text-sm hover:underline">+ Add transaction</button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Account</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paged.map(tx => {
                    const cat = data.categories.find(c => c.id === tx.category);
                    const acc = data.accounts.find(a => a.id === tx.accountId);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cat?.icon ?? '📦'}</span>
                            <span className="text-gray-700">{cat?.name ?? 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-48 truncate">{tx.notes || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{acc?.name ?? '—'}</td>
                        <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                          <span className={tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-600'}>
                            {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '↔'}{formatCurrency(tx.amount, currency)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => openEdit(tx)} className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => handleDelete(tx.id)} className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">Page {page} of {pageCount}</p>
                <div className="flex gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                    className="p-1.5 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Transaction' : 'Add Transaction'}>
        <div className="space-y-4">
          {/* Type Toggle */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} onClick={() => setForm(f => ({ ...f, type: t, category: '' }))}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${form.type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00" min="0" step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
              {relevantCategories.map(c => (
                <button key={c.id} onClick={() => setForm(f => ({ ...f, category: c.id }))}
                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                    form.category === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <span>{c.icon}</span> {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select account</option>
              {data.accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Add a description..." rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {editing ? 'Update' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Import Modal */}
      <Modal open={showImport} onClose={() => { setShowImport(false); setImportResult(null); }} title="Import CSV">
        <div className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
            <p className="font-medium mb-1">CSV Format Requirements:</p>
            <p>Required columns: <code>date</code>, <code>amount</code></p>
            <p>Optional: <code>description</code>, <code>type</code> (income/expense), <code>category</code></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Account</label>
            <select value={importAccountId} onChange={e => setImportAccountId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select account</option>
              {data.accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSV File</label>
            <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          </div>
          {importResult && (
            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-1">
              <p className="font-medium text-gray-900">Preview:</p>
              <p className="text-green-600">{importResult.success} transactions ready to import</p>
              {importResult.errors.length > 0 && (
                <div className="mt-1">
                  <p className="text-red-600">{importResult.errors.length} errors:</p>
                  {importResult.errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-red-500">{e}</p>)}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowImport(false); setImportResult(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={confirmImport} disabled={!importResult || importResult.success === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              Import {importResult?.success ?? 0} Transactions
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
