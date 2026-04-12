import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, CalendarDays, PlayCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { scheduledEntriesApi } from '../lib/api';
import type { ScheduledEntry } from '../types';
import { toast } from 'sonner';

type Tab = 'income' | 'expense';

interface EntryForm {
  title: string;
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  notes: string;
}

const EMPTY_FORM: EntryForm = { title: '', amount: '', date: '', accountId: '', categoryId: '', notes: '' };

const STATUS_STYLES: Record<ScheduledEntry['status'], string> = {
  pending:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  applied:   'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_ICONS: Record<ScheduledEntry['status'], React.ElementType> = {
  pending:   Clock,
  applied:   CheckCircle,
  cancelled: XCircle,
};

export default function ScheduledEntries() {
  const { data, addScheduledEntry, updateScheduledEntry, deleteScheduledEntry, refreshData } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [tab, setTab] = useState<Tab>('income');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ScheduledEntry | null>(null);
  const [form, setForm] = useState<EntryForm>(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState<'all' | ScheduledEntry['status']>('all');
  const [applyingId, setApplyingId] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Show all categories so dropdown is never empty — grouped by type for UX
  const incomeCategories = data.categories.filter(c => c.type === 'income');
  const expenseCategories = data.categories.filter(c => c.type === 'expense');

  const filtered = useMemo(() => {
    return data.scheduledEntries
      .filter(e => e.type === tab)
      .filter(e => filterStatus === 'all' || e.status === filterStatus)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data.scheduledEntries, tab, filterStatus]);

  const pending = data.scheduledEntries.filter(e => e.status === 'pending');
  const pendingIncome  = pending.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const pendingExpense = pending.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);
  const overdueCount   = pending.filter(e => e.date < today).length;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date: today });
    setShowModal(true);
  };

  const openEdit = (e: ScheduledEntry) => {
    setEditing(e);
    setForm({ title: e.title, amount: String(e.amount), date: e.date, accountId: e.accountId, categoryId: e.categoryId, notes: e.notes });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    if (!form.accountId) { toast.error('Select an account'); return; }

    if (editing) {
      updateScheduledEntry(editing.id, {
        title: form.title.trim(), amount, date: form.date,
        accountId: form.accountId, categoryId: form.categoryId, notes: form.notes.trim(),
      });
      toast.success('Entry updated');
    } else {
      addScheduledEntry({
        type: tab, title: form.title.trim(), amount, date: form.date,
        accountId: form.accountId, categoryId: form.categoryId, notes: form.notes.trim(),
      });
      toast.success(`Upcoming ${tab} scheduled`);
    }
    setShowModal(false);
  };

  // Manually apply a single entry → creates real transaction immediately
  const handleApplyNow = async (e: ScheduledEntry) => {
    if (!confirm(`Add "${e.title}" (${formatCurrency(e.amount, currency)}) to ${e.type === 'income' ? 'Income' : 'Expense'} now?`)) return;
    setApplyingId(e.id);
    try {
      await scheduledEntriesApi.applyOne(e.id);
      await refreshData();
      toast.success(`Added to ${e.type === 'income' ? 'income' : 'expenses'} successfully`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to apply entry');
    } finally {
      setApplyingId(null);
    }
  };

  const handleCancel = (e: ScheduledEntry) => {
    if (confirm('Cancel this scheduled entry?')) {
      updateScheduledEntry(e.id, { status: 'cancelled' });
      toast.success('Entry cancelled');
    }
  };

  const handleDelete = (e: ScheduledEntry) => {
    if (confirm('Delete this entry permanently?')) {
      deleteScheduledEntry(e.id);
      toast.success('Entry deleted');
    }
  };

  // Categories shown in the modal — match the current tab type, fallback to all
  const modalCategories = tab === 'income'
    ? (incomeCategories.length > 0 ? incomeCategories : data.categories)
    : (expenseCategories.length > 0 ? expenseCategories : data.categories);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div>
            <p className="text-xs text-green-600 font-medium">Upcoming Income</p>
            <p className="text-lg font-bold text-green-700">{formatCurrency(pendingIncome, currency)}</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
            <TrendingDown size={20} className="text-red-600" />
          </div>
          <div>
            <p className="text-xs text-red-600 font-medium">Upcoming Expense</p>
            <p className="text-lg font-bold text-red-700">{formatCurrency(pendingExpense, currency)}</p>
          </div>
        </div>
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${overdueCount > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${overdueCount > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
            <CalendarDays size={20} className={overdueCount > 0 ? 'text-orange-600' : 'text-gray-500'} />
          </div>
          <div>
            <p className={`text-xs font-medium ${overdueCount > 0 ? 'text-orange-600' : 'text-gray-500'}`}>Overdue Pending</p>
            <p className={`text-lg font-bold ${overdueCount > 0 ? 'text-orange-700' : 'text-gray-700'}`}>{overdueCount} entries</p>
            {overdueCount > 0 && <p className="text-xs text-orange-500">Click Apply to add now</p>}
          </div>
        </div>
      </div>

      {/* Tabs + Actions */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex gap-1 border-b border-gray-200">
            <button
              onClick={() => setTab('income')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'income' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <TrendingUp size={14} /> Upcoming Income
            </button>
            <button
              onClick={() => setTab('expense')}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'expense' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <TrendingDown size={14} /> Upcoming Expense
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="applied">Applied</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button
              onClick={openAdd}
              className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm ${tab === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              <Plus size={14} /> Add {tab === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CalendarDays size={36} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium mb-1">No upcoming {tab === 'income' ? 'income' : 'expenses'}</p>
            <p className="text-gray-300 text-xs">Add entries to automatically create transactions on their scheduled date, or apply manually</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(e => {
              const account  = data.accounts.find(a => a.id === e.accountId);
              const category = data.categories.find(c => c.id === e.categoryId);
              const isOverdue = e.status === 'pending' && e.date < today;
              const StatusIcon = STATUS_ICONS[e.status];
              const isApplying = applyingId === e.id;

              return (
                <div key={e.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${isOverdue ? 'border-orange-200 bg-orange-50/30' : 'border-gray-200'}`}>
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${e.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {e.type === 'income'
                      ? <TrendingUp size={16} className="text-green-600" />
                      : <TrendingDown size={16} className="text-red-600" />
                    }
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{e.title}</p>
                      {isOverdue && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">Overdue</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                      <span className="flex items-center gap-0.5"><CalendarDays size={11} /> {formatDate(e.date)}</span>
                      {account  && <span>· {account.name}</span>}
                      {category && <span>· {category.icon} {category.name}</span>}
                      {e.notes  && <span>· {e.notes}</span>}
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-base font-bold ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {e.type === 'income' ? '+' : '-'}{formatCurrency(e.amount, currency)}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${STATUS_STYLES[e.status]}`}>
                      <StatusIcon size={11} /> {e.status}
                    </span>
                  </div>

                  {/* Actions */}
                  {e.status === 'pending' && (
                    <div className="flex gap-1 flex-shrink-0 ml-1">
                      {/* Apply Now — manually add to income/expense */}
                      <button
                        onClick={() => handleApplyNow(e)}
                        disabled={isApplying}
                        title="Add to Income/Expense now"
                        className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                      >
                        {isApplying
                          ? <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          : <PlayCircle size={13} />
                        }
                        Apply
                      </button>
                      <button onClick={() => openEdit(e)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleCancel(e)} className="p-1.5 text-gray-400 hover:text-yellow-600 rounded-lg hover:bg-yellow-50">
                        <XCircle size={13} />
                      </button>
                      <button onClick={() => handleDelete(e)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                  {e.status !== 'pending' && (
                    <button onClick={() => handleDelete(e)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 flex-shrink-0">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing
          ? `Edit Scheduled ${tab === 'income' ? 'Income' : 'Expense'}`
          : `Add Upcoming ${tab === 'income' ? 'Income' : 'Expense'}`
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title / Description</label>
            <input
              type="text"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder={tab === 'income' ? 'e.g. Salary, Freelance payment' : 'e.g. Rent, Insurance premium'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={form.amount}
                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Account dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            {data.accounts.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No accounts found. Add an account first.</p>
            ) : (
              <select
                value={form.accountId}
                onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select account</option>
                {data.accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Category grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            {modalCategories.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No categories found.</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                <button
                  onClick={() => setForm(f => ({ ...f, categoryId: '' }))}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium ${form.categoryId === '' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  — None
                </button>
                {modalCategories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setForm(f => ({ ...f, categoryId: c.id }))}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium ${form.categoryId === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span>{c.icon}</span> {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any additional notes"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
            <strong>Auto-apply:</strong> This entry will automatically become a real transaction on the selected date.<br/>
            <strong>Manual apply:</strong> Click the <strong>Apply</strong> button on any entry to add it to income/expense immediately.
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={handleSave}
              className={`flex-1 px-4 py-2 text-white rounded-lg text-sm ${tab === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {editing ? 'Update' : 'Schedule'} {tab === 'income' ? 'Income' : 'Expense'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
