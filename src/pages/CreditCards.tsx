import { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard as CreditCardIcon, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getDaysUntil } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import type { CreditCard } from '../types';
import { toast } from 'sonner';

const CARD_COLORS = ['#1E3A8A', '#1F2937', '#7C3AED', '#DC2626', '#065F46', '#92400E', '#1D4ED8', '#BE185D'];

interface CardForm { name: string; bank: string; last4: string; creditLimit: string; currentBalance: string; billingDay: string; dueDay: string; color: string; }
const emptyForm: CardForm = { name: '', bank: '', last4: '', creditLimit: '', currentBalance: '0', billingDay: '1', dueDay: '25', color: '#1E3A8A' };

export default function CreditCards() {
  const { data, addCreditCard, updateCreditCard, deleteCreditCard } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);
  const [form, setForm] = useState<CardForm>(emptyForm);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (c: CreditCard) => {
    setEditing(c);
    setForm({ name: c.name, bank: c.bank, last4: c.last4, creditLimit: String(c.creditLimit), currentBalance: String(c.currentBalance), billingDay: String(c.billingDay), dueDay: String(c.dueDay), color: c.color });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Card name is required'); return; }
    const limit = parseFloat(form.creditLimit);
    if (!limit || limit <= 0) { toast.error('Enter a valid credit limit'); return; }
    const payload = {
      name: form.name, bank: form.bank, last4: form.last4.slice(-4),
      creditLimit: limit, currentBalance: parseFloat(form.currentBalance) || 0,
      billingDay: parseInt(form.billingDay) || 1, dueDay: parseInt(form.dueDay) || 25,
      color: form.color,
    };
    if (editing) {
      updateCreditCard(editing.id, payload);
      toast.success('Card updated');
    } else {
      addCreditCard(payload);
      toast.success('Card added');
    }
    setShowModal(false);
  };

  const totalUsed = data.creditCards.reduce((s, c) => s + c.currentBalance, 0);
  const totalLimit = data.creditCards.reduce((s, c) => s + c.creditLimit, 0);

  const now = new Date();

  return (
    <div className="p-4 md:p-6">
      {/* Summary */}
      {data.creditCards.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Used</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalUsed, currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Total Limit</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalLimit, currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Utilization</p>
            <p className="text-xl font-bold text-gray-900">{totalLimit > 0 ? ((totalUsed / totalLimit) * 100).toFixed(1) : '0'}%</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Credit Cards</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Add Card
        </button>
      </div>

      {data.creditCards.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CreditCardIcon size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No credit cards added</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {data.creditCards.map(card => {
            const utilPct = card.creditLimit > 0 ? (card.currentBalance / card.creditLimit) * 100 : 0;
            const dueDay = parseInt(String(card.dueDay));
            const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
            if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);
            const daysUntilDue = getDaysUntil(dueDate.toISOString().split('T')[0]);
            const available = card.creditLimit - card.currentBalance;

            return (
              <div key={card.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Card Visual */}
                <div className="relative p-5 pb-4" style={{ backgroundColor: card.color }}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-white/70 text-xs font-medium">{card.bank}</p>
                      <p className="text-white font-bold text-lg">{card.name}</p>
                    </div>
                    <CreditCardIcon className="text-white/50" size={28} />
                  </div>
                  <p className="text-white/60 text-sm font-mono">•••• •••• •••• {card.last4 || '••••'}</p>
                </div>

                {/* Card Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Credit Used</span>
                      <span className={utilPct >= 90 ? 'text-red-600 font-medium' : utilPct >= 70 ? 'text-yellow-600 font-medium' : 'text-gray-500'}>
                        {utilPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${utilPct >= 90 ? 'bg-red-500' : utilPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(utilPct, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-red-600">Used: {formatCurrency(card.currentBalance, currency)}</span>
                      <span className="text-green-600">Available: {formatCurrency(available, currency)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Billing day: {card.billingDay}</span>
                    <div className="flex items-center gap-1">
                      {daysUntilDue <= 7 && <AlertCircle size={12} className="text-yellow-500" />}
                      <span>Payment due: Day {card.dueDay} ({daysUntilDue > 0 ? `${daysUntilDue}d` : 'today'})</span>
                    </div>
                  </div>

                  {/* Update Balance */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        const val = prompt(`Update balance for ${card.name}:`, String(card.currentBalance));
                        if (val !== null) {
                          const n = parseFloat(val);
                          if (!isNaN(n) && n >= 0) { updateCreditCard(card.id, { currentBalance: n }); toast.success('Balance updated'); }
                        }
                      }}
                      className="flex-1 text-xs text-blue-600 border border-blue-200 py-1.5 rounded-lg hover:bg-blue-50 font-medium"
                    >
                      Update Balance
                    </button>
                    <button onClick={() => openEdit(card)} className="p-1.5 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg"><Edit2 size={12} /></button>
                    <button onClick={() => { if (confirm('Delete this card?')) { deleteCreditCard(card.id); toast.success('Card deleted'); } }}
                      className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Credit Card' : 'Add Credit Card'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Card Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. My Visa Card"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank</label>
              <input type="text" value={form.bank} onChange={e => setForm(f => ({ ...f, bank: e.target.value }))}
                placeholder="e.g. HBL"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last 4 Digits</label>
              <input type="text" value={form.last4} onChange={e => setForm(f => ({ ...f, last4: e.target.value.slice(-4) }))}
                placeholder="1234" maxLength={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
              <input type="number" value={form.creditLimit} onChange={e => setForm(f => ({ ...f, creditLimit: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Balance</label>
              <input type="number" value={form.currentBalance} onChange={e => setForm(f => ({ ...f, currentBalance: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Billing Day</label>
              <input type="number" value={form.billingDay} onChange={e => setForm(f => ({ ...f, billingDay: e.target.value }))}
                min="1" max="31"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day</label>
              <input type="number" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                min="1" max="31"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Card Color</label>
            <div className="flex gap-2">
              {CARD_COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className={`w-8 h-8 rounded-lg border-2 transition-transform ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Update' : 'Add'} Card</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
