import { useState } from 'react';
import { Plus, Trash2, Users2, Check, X } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, generateId, todayISO } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import type { SplitParticipant } from '../types';
import { toast } from 'sonner';

interface SplitForm {
  title: string;
  totalAmount: string;
  date: string;
  category: string;
  accountId: string;
  notes: string;
  participants: { name: string; amount: string }[];
}

export default function SplitExpenses() {
  const { data, addSplit, deleteSplit, markParticipantPaid } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'settled'>('active');
  const [form, setForm] = useState<SplitForm>({
    title: '', totalAmount: '', date: todayISO(), category: 'cat_food', accountId: '', notes: '',
    participants: [{ name: '', amount: '' }, { name: '', amount: '' }],
  });

  const openAdd = () => {
    setForm({
      title: '', totalAmount: '', date: todayISO(), category: 'cat_food',
      accountId: data.accounts[0]?.id ?? '', notes: '',
      participants: [{ name: '', amount: '' }, { name: '', amount: '' }],
    });
    setShowModal(true);
  };

  const updateParticipant = (idx: number, field: 'name' | 'amount', value: string) => {
    setForm(f => ({
      ...f,
      participants: f.participants.map((p, i) => i === idx ? { ...p, [field]: value } : p),
    }));
  };

  const addParticipant = () => setForm(f => ({ ...f, participants: [...f.participants, { name: '', amount: '' }] }));
  const removeParticipant = (idx: number) => {
    if (form.participants.length <= 2) return;
    setForm(f => ({ ...f, participants: f.participants.filter((_, i) => i !== idx) }));
  };

  const splitEvenly = () => {
    const total = parseFloat(form.totalAmount);
    if (!total || form.participants.length === 0) return;
    const each = (total / form.participants.length).toFixed(2);
    setForm(f => ({ ...f, participants: f.participants.map(p => ({ ...p, amount: each })) }));
  };

  const handleSave = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    const total = parseFloat(form.totalAmount);
    if (!total || total <= 0) { toast.error('Enter a valid total amount'); return; }
    const validParticipants = form.participants.filter(p => p.name.trim());
    if (validParticipants.length < 2) { toast.error('Add at least 2 participants'); return; }

    const participants: SplitParticipant[] = validParticipants.map(p => ({
      id: generateId(),
      name: p.name.trim(),
      amount: parseFloat(p.amount) || 0,
      isPaid: false,
    }));

    addSplit({
      title: form.title, totalAmount: total, date: form.date,
      category: form.category, accountId: form.accountId, notes: form.notes,
      participants, status: 'active',
    });
    toast.success('Split expense added');
    setShowModal(false);
  };

  const shownSplits = data.splitExpenses.filter(s => s.status === activeTab);

  return (
    <div className="p-4 md:p-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Active Splits', value: data.splitExpenses.filter(s => s.status === 'active').length, color: 'text-blue-600' },
          { label: 'Total Outstanding', value: formatCurrency(data.splitExpenses.filter(s => s.status === 'active').reduce((sum, s) => sum + s.participants.filter(p => !p.isPaid).reduce((s2, p) => s2 + p.amount, 0), 0), currency), color: 'text-red-600' },
          { label: 'Settled', value: data.splitExpenses.filter(s => s.status === 'settled').length, color: 'text-green-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['active', 'settled'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {t}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Add Split
        </button>
      </div>

      {shownSplits.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Users2 size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No {activeTab} split expenses</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shownSplits.map(split => {
            const cat = data.categories.find(c => c.id === split.category);
            const outstanding = split.participants.filter(p => !p.isPaid).reduce((s, p) => s + p.amount, 0);
            return (
              <div key={split.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{split.title}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${split.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {split.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(split.date)} · {cat?.icon} {cat?.name}</p>
                    {split.notes && <p className="text-xs text-gray-400 mt-0.5">{split.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(split.totalAmount, currency)}</p>
                      <p className="text-xs text-red-500">{formatCurrency(outstanding, currency)} left</p>
                    </div>
                    <button onClick={() => { if (confirm('Delete split?')) { deleteSplit(split.id); toast.success('Split deleted'); } }}
                      className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg"><Trash2 size={12} /></button>
                  </div>
                </div>

                {/* Participants */}
                <div className="space-y-2">
                  {split.participants.map(p => (
                    <div key={p.id} className={`flex items-center justify-between p-2 rounded-lg ${p.isPaid ? 'bg-green-50' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${p.isPaid ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-700'}`}>
                          {p.name[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700">{p.name}</span>
                        {p.isPaid && p.paidDate && <span className="text-xs text-gray-400">Paid {formatDate(p.paidDate)}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{formatCurrency(p.amount, currency)}</span>
                        {!p.isPaid && split.status === 'active' && (
                          <button
                            onClick={() => { markParticipantPaid(split.id, p.id); toast.success(`${p.name} marked as paid`); }}
                            className="text-xs text-green-600 border border-green-200 px-2 py-0.5 rounded hover:bg-green-50 flex items-center gap-0.5"
                          >
                            <Check size={10} /> Paid
                          </button>
                        )}
                        {p.isPaid && <Check size={14} className="text-green-500" />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Split Expense" size="lg">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Dinner at Restaurant"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
              <input type="number" value={form.totalAmount} onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {data.categories.filter(c => c.type === 'expense').map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select value={form.accountId} onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select account</option>
                {data.accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
              </select>
            </div>
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Participants</label>
              <button onClick={splitEvenly} className="text-xs text-blue-600 hover:underline">Split evenly</button>
            </div>
            <div className="space-y-2">
              {form.participants.map((p, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input type="text" value={p.name} onChange={e => updateParticipant(idx, 'name', e.target.value)}
                    placeholder={`Person ${idx + 1}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={p.amount} onChange={e => updateParticipant(idx, 'amount', e.target.value)}
                    placeholder="0.00"
                    className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={() => removeParticipant(idx)} className="p-2 text-gray-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addParticipant} className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1">
              <Plus size={12} /> Add Person
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any notes..." rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add Split</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
