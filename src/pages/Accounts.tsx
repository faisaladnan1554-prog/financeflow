import { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeftRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import type { Account } from '../types';
import { toast } from 'sonner';

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'checking', label: 'Bank Account', icon: '🏦' },
  { value: 'savings', label: 'Savings', icon: '🏺' },
  { value: 'mobile_wallet', label: 'Mobile Wallet', icon: '📱' },
  { value: 'investment', label: 'Investment', icon: '📈' },
];

const COLORS = ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899', '#84CC16'];

interface AccountForm {
  name: string;
  type: Account['type'];
  balance: string;
  icon: string;
  color: string;
}

const emptyForm: AccountForm = { name: '', type: 'cash', balance: '0', icon: '💵', color: '#2563EB' };

export default function Accounts() {
  const { data, addAccount, updateAccount, deleteAccount, transferBetweenAccounts } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [showModal, setShowModal] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [transfer, setTransfer] = useState({ fromId: '', toId: '', amount: '', note: '' });

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (a: Account) => {
    setEditing(a);
    setForm({ name: a.name, type: a.type, balance: String(a.balance), icon: a.icon, color: a.color });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const balance = parseFloat(form.balance) || 0;
    if (editing) {
      updateAccount(editing.id, { name: form.name, type: form.type, balance, icon: form.icon, color: form.color });
      toast.success('Account updated');
    } else {
      addAccount({ name: form.name, type: form.type, balance, currency: user?.currency ?? 'PKR', icon: form.icon, color: form.color });
      toast.success('Account added');
    }
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this account?')) {
      deleteAccount(id);
      toast.success('Account deleted');
    }
  };

  const handleTransfer = () => {
    const amount = parseFloat(transfer.amount);
    if (!transfer.fromId || !transfer.toId) { toast.error('Select both accounts'); return; }
    if (transfer.fromId === transfer.toId) { toast.error('Select different accounts'); return; }
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const from = data.accounts.find(a => a.id === transfer.fromId);
    if (from && from.balance < amount) { toast.error('Insufficient balance'); return; }
    transferBetweenAccounts(transfer.fromId, transfer.toId, amount, transfer.note || 'Transfer');
    toast.success('Transfer successful');
    setShowTransfer(false);
    setTransfer({ fromId: '', toId: '', amount: '', note: '' });
  };

  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Accounts</h2>
          <p className="text-sm text-gray-500">Total: {formatCurrency(totalBalance, currency)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTransfer(true)}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
          >
            <ArrowLeftRight size={14} /> Transfer
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Add Account
          </button>
        </div>
      </div>

      {data.accounts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-3">No accounts yet</p>
          <button onClick={openAdd} className="text-blue-600 text-sm font-medium hover:underline">
            + Add your first account
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.accounts.map(acc => (
            <div key={acc.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: acc.color + '20' }}>
                    {acc.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{ACCOUNT_TYPES.find(t => t.value === acc.type)?.label}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(acc)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDelete(acc.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-2xl font-bold" style={{ color: acc.color }}>
                {formatCurrency(acc.balance, currency)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Account' : 'Add Account'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Main Bank Account"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, type: t.value as Account['type'], icon: t.icon }))}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                    form.type === t.value ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editing ? 'Balance' : 'Opening Balance'}
            </label>
            <input
              type="number"
              value={form.balance}
              onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              {editing ? 'Update' : 'Add'} Account
            </button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal open={showTransfer} onClose={() => setShowTransfer(false)} title="Transfer Between Accounts">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Account</label>
            <select
              value={transfer.fromId}
              onChange={e => setTransfer(t => ({ ...t, fromId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account</option>
              {data.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name} ({formatCurrency(a.balance, currency)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To Account</label>
            <select
              value={transfer.toId}
              onChange={e => setTransfer(t => ({ ...t, toId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account</option>
              {data.accounts.map(a => (
                <option key={a.id} value={a.id}>{a.icon} {a.name} ({formatCurrency(a.balance, currency)})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
            <input
              type="number"
              value={transfer.amount}
              onChange={e => setTransfer(t => ({ ...t, amount: e.target.value }))}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              type="text"
              value={transfer.note}
              onChange={e => setTransfer(t => ({ ...t, note: e.target.value }))}
              placeholder="Transfer note"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowTransfer(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleTransfer} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Transfer
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
