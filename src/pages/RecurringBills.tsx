import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Check, Receipt, AlertCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getCurrentMonth, getDaysUntil } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import type { RecurringBill } from '../types';
import { toast } from 'sonner';

interface BillForm { name: string; amount: string; category: string; accountId: string; dueDay: string; frequency: RecurringBill['frequency']; isActive: boolean; }
const emptyForm: BillForm = { name: '', amount: '', category: 'cat_utilities', accountId: '', dueDay: '1', frequency: 'monthly', isActive: true };

export default function RecurringBills() {
  const { data, addBill, updateBill, deleteBill, markBillPaid } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';
  const currentMonth = getCurrentMonth();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RecurringBill | null>(null);
  const [form, setForm] = useState<BillForm>(emptyForm);

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, accountId: data.accounts[0]?.id ?? '' }); setShowModal(true); };
  const openEdit = (b: RecurringBill) => {
    setEditing(b);
    setForm({ name: b.name, amount: String(b.amount), category: b.category, accountId: b.accountId, dueDay: String(b.dueDay), frequency: b.frequency, isActive: b.isActive });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Bill name is required'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const payload = { name: form.name, amount, category: form.category, accountId: form.accountId, dueDay: parseInt(form.dueDay) || 1, frequency: form.frequency, isActive: form.isActive };
    if (editing) {
      updateBill(editing.id, payload);
      toast.success('Bill updated');
    } else {
      addBill(payload);
      toast.success('Bill added');
    }
    setShowModal(false);
  };

  const billsWithStatus = useMemo(() => data.recurringBills.map(b => {
    const paidThisMonth = b.payments.some(p => p.month === currentMonth);
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), b.dueDay);
    if (dueDate < now && !paidThisMonth) dueDate.setMonth(dueDate.getMonth() + 1);
    const daysLeft = getDaysUntil(dueDate.toISOString().split('T')[0]);
    return { ...b, paidThisMonth, daysLeft };
  }), [data.recurringBills, currentMonth]);

  const activeBills = billsWithStatus.filter(b => b.isActive);
  const totalMonthly = activeBills.reduce((s, b) => s + b.amount, 0);
  const paidCount = activeBills.filter(b => b.paidThisMonth).length;

  return (
    <div className="p-4 md:p-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Monthly Bills</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(totalMonthly, currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Paid This Month</p>
          <p className="text-xl font-bold text-green-600">{paidCount} / {activeBills.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Remaining</p>
          <p className="text-xl font-bold text-red-600">
            {formatCurrency(activeBills.filter(b => !b.paidThisMonth).reduce((s, b) => s + b.amount, 0), currency)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recurring Bills</h2>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Add Bill
        </button>
      </div>

      {billsWithStatus.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <Receipt size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No recurring bills added</p>
        </div>
      ) : (
        <div className="space-y-3">
          {billsWithStatus.map(bill => {
            const cat = data.categories.find(c => c.id === bill.category);
            return (
              <div key={bill.id} className={`bg-white rounded-xl border p-4 ${!bill.isActive ? 'opacity-60 border-gray-100' : bill.paidThisMonth ? 'border-green-200' : bill.daysLeft <= 3 ? 'border-red-200' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${bill.paidThisMonth ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {cat?.icon ?? '💡'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{bill.name}</p>
                        {!bill.isActive && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactive</span>}
                        {bill.paidThisMonth && <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Paid</span>}
                        {!bill.paidThisMonth && bill.daysLeft <= 3 && bill.isActive && (
                          <span className="text-xs text-red-600 bg-red-100 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <AlertCircle size={10} /> Urgent
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Due day {bill.dueDay} · {bill.frequency}
                        {!bill.paidThisMonth && bill.isActive && ` · ${bill.daysLeft > 0 ? `${bill.daysLeft}d left` : bill.daysLeft === 0 ? 'due today' : `${Math.abs(bill.daysLeft)}d overdue`}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">{formatCurrency(bill.amount, currency)}</p>
                      <p className="text-xs text-gray-400">{cat?.name ?? 'Utility'}</p>
                    </div>
                    <div className="flex gap-1">
                      {!bill.paidThisMonth && bill.isActive && (
                        <button
                          onClick={() => { markBillPaid(bill.id, bill.amount); toast.success(`${bill.name} marked as paid`); }}
                          className="p-1.5 text-green-600 hover:bg-green-50 border border-green-200 rounded-lg"
                          title="Mark as paid"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button onClick={() => openEdit(bill)} className="p-1.5 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg"><Edit2 size={13} /></button>
                      <button onClick={() => { if (confirm('Delete bill?')) { deleteBill(bill.id); toast.success('Bill deleted'); } }}
                        className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg"><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Bill' : 'Add Recurring Bill'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Name</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Internet Bill"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Day (1-31)</label>
              <input type="number" value={form.dueDay} onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                min="1" max="31"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value as RecurringBill['frequency'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
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
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Update' : 'Add'} Bill</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
