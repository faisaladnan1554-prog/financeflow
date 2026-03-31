import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Check, Receipt, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getCurrentMonth, getDaysUntil } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import type { RecurringBill } from '../types';
import { toast } from 'sonner';

interface BillForm {
  name: string;
  amount: string;
  category: string;
  accountId: string;
  dueDay: string;
  frequency: RecurringBill['frequency'];
  isActive: boolean;
  entryType: 'bill' | 'income';
}

const emptyForm = (tab: 'bill' | 'income'): BillForm => ({
  name: '', amount: '', category: '', accountId: '', dueDay: '1',
  frequency: 'monthly', isActive: true, entryType: tab,
});

export default function RecurringBills() {
  const { data, addBill, updateBill, deleteBill, markBillPaid } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';
  const currentMonth = getCurrentMonth();

  const [activeTab, setActiveTab] = useState<'bill' | 'income'>('bill');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<RecurringBill | null>(null);
  const [form, setForm] = useState<BillForm>(emptyForm('bill'));

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm(activeTab), accountId: data.accounts[0]?.id ?? '' });
    setShowModal(true);
  };

  const openEdit = (b: RecurringBill) => {
    setEditing(b);
    const et = (b as RecurringBill & { entryType?: 'bill' | 'income' }).entryType ?? 'bill';
    setForm({
      name: b.name, amount: String(b.amount), category: b.category,
      accountId: b.accountId, dueDay: String(b.dueDay), frequency: b.frequency,
      isActive: b.isActive, entryType: et,
    });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error(`${form.entryType === 'income' ? 'Income' : 'Bill'} name is required`); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    const payload = {
      name: form.name, amount, category: form.category, accountId: form.accountId,
      dueDay: parseInt(form.dueDay) || 1, frequency: form.frequency, isActive: form.isActive,
      entryType: form.entryType,
    } as Omit<RecurringBill, 'id' | 'createdAt' | 'payments'>;
    if (editing) {
      updateBill(editing.id, payload);
      toast.success(`${form.entryType === 'income' ? 'Income' : 'Bill'} updated`);
    } else {
      addBill(payload);
      toast.success(`${form.entryType === 'income' ? 'Recurring income' : 'Recurring bill'} added`);
    }
    setShowModal(false);
  };

  const allWithStatus = useMemo(() => data.recurringBills.map(b => {
    const paidThisMonth = b.payments.some(p => p.month === currentMonth);
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), b.dueDay);
    if (dueDate < now && !paidThisMonth) dueDate.setMonth(dueDate.getMonth() + 1);
    const daysLeft = getDaysUntil(dueDate.toISOString().split('T')[0]);
    const et = (b as RecurringBill & { entryType?: string }).entryType ?? 'bill';
    return { ...b, paidThisMonth, daysLeft, entryType: et };
  }), [data.recurringBills, currentMonth]);

  const bills   = allWithStatus.filter(b => b.entryType !== 'income');
  const incomes = allWithStatus.filter(b => b.entryType === 'income');
  const displayed = activeTab === 'bill' ? bills : incomes;

  const activeBills   = bills.filter(b => b.isActive);
  const activeIncomes = incomes.filter(b => b.isActive);

  const totalMonthlyBills   = activeBills.reduce((s, b) => s + b.amount, 0);
  const totalMonthlyIncome  = activeIncomes.reduce((s, b) => s + b.amount, 0);
  const paidBills           = activeBills.filter(b => b.paidThisMonth).length;
  const receivedIncomes     = activeIncomes.filter(b => b.paidThisMonth).length;

  const relevantCategories = useMemo(() =>
    data.categories.filter(c => c.type === (form.entryType === 'income' ? 'income' : 'expense')),
    [data.categories, form.entryType]
  );

  return (
    <div className="p-4 md:p-6">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl mb-5 w-fit">
        <button
          onClick={() => setActiveTab('bill')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'bill' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingDown size={15} className={activeTab === 'bill' ? 'text-red-500' : 'text-gray-400'} />
          Recurring Bills
          {activeBills.length > 0 && (
            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{activeBills.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp size={15} className={activeTab === 'income' ? 'text-green-500' : 'text-gray-400'} />
          Recurring Income
          {activeIncomes.length > 0 && (
            <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full">{activeIncomes.length}</span>
          )}
        </button>
      </div>

      {/* Summary Stats */}
      {activeTab === 'bill' ? (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Monthly Bills</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totalMonthlyBills, currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Paid This Month</p>
            <p className="text-xl font-bold text-green-600">{paidBills} / {activeBills.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Remaining to Pay</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(activeBills.filter(b => !b.paidThisMonth).reduce((s, b) => s + b.amount, 0), currency)}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Monthly Income</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totalMonthlyIncome, currency)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Received This Month</p>
            <p className="text-xl font-bold text-green-600">{receivedIncomes} / {activeIncomes.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Pending to Receive</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(activeIncomes.filter(b => !b.paidThisMonth).reduce((s, b) => s + b.amount, 0), currency)}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {activeTab === 'bill' ? 'Recurring Bills' : 'Recurring Income'}
        </h2>
        <button
          onClick={openAdd}
          className={`flex items-center gap-1.5 px-3 py-2 text-white rounded-lg text-sm ${
            activeTab === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          <Plus size={14} /> {activeTab === 'income' ? 'Add Income' : 'Add Bill'}
        </button>
      </div>

      {displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          {activeTab === 'income' ? (
            <TrendingUp size={32} className="text-gray-300 mx-auto mb-2" />
          ) : (
            <Receipt size={32} className="text-gray-300 mx-auto mb-2" />
          )}
          <p className="text-gray-400 text-sm">
            {activeTab === 'income' ? 'No recurring income added yet' : 'No recurring bills added'}
          </p>
          <button onClick={openAdd} className={`mt-2 text-sm hover:underline ${activeTab === 'income' ? 'text-green-600' : 'text-blue-600'}`}>
            + Add your first {activeTab === 'income' ? 'recurring income' : 'recurring bill'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(bill => {
            const cat = data.categories.find(c => c.id === bill.category);
            const isIncome = bill.entryType === 'income';
            return (
              <div key={bill.id} className={`bg-white rounded-xl border p-4 ${
                !bill.isActive ? 'opacity-60 border-gray-100' :
                bill.paidThisMonth ? (isIncome ? 'border-green-200 bg-green-50/30' : 'border-green-200') :
                !isIncome && bill.daysLeft <= 3 ? 'border-red-200' :
                isIncome && bill.daysLeft <= 3 ? 'border-blue-200' :
                'border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      bill.paidThisMonth ? (isIncome ? 'bg-green-100' : 'bg-green-100') :
                      isIncome ? 'bg-blue-50' : 'bg-gray-100'
                    }`}>
                      {cat?.icon ?? (isIncome ? '💰' : '💡')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900">{bill.name}</p>
                        {isIncome && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">Income</span>
                        )}
                        {!bill.isActive && <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactive</span>}
                        {bill.paidThisMonth && (
                          <span className={`text-xs px-1.5 py-0.5 rounded ${isIncome ? 'text-green-600 bg-green-100' : 'text-green-600 bg-green-100'}`}>
                            {isIncome ? 'Received' : 'Paid'}
                          </span>
                        )}
                        {!bill.paidThisMonth && bill.daysLeft <= 3 && bill.isActive && (
                          <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${isIncome ? 'text-blue-600 bg-blue-100' : 'text-red-600 bg-red-100'}`}>
                            <AlertCircle size={10} /> {isIncome ? 'Expected soon' : 'Urgent'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        {isIncome ? 'Expected' : 'Due'} day {bill.dueDay} · {bill.frequency}
                        {!bill.paidThisMonth && bill.isActive && (
                          ` · ${bill.daysLeft > 0 ? `${bill.daysLeft}d left` : bill.daysLeft === 0 ? (isIncome ? 'expected today' : 'due today') : `${Math.abs(bill.daysLeft)}d ${isIncome ? 'overdue' : 'overdue'}`}`
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${isIncome ? 'text-green-600' : 'text-gray-900'}`}>
                        {isIncome ? '+' : ''}{formatCurrency(bill.amount, currency)}
                      </p>
                      <p className="text-xs text-gray-400">{cat?.name ?? (isIncome ? 'Income' : 'Utility')}</p>
                    </div>
                    <div className="flex gap-1">
                      {!bill.paidThisMonth && bill.isActive && (
                        <button
                          onClick={() => {
                            markBillPaid(bill.id, bill.amount);
                            toast.success(`${bill.name} marked as ${isIncome ? 'received' : 'paid'}`);
                          }}
                          className={`p-1.5 border rounded-lg ${isIncome ? 'text-green-600 hover:bg-green-50 border-green-200' : 'text-green-600 hover:bg-green-50 border-green-200'}`}
                          title={isIncome ? 'Mark as received' : 'Mark as paid'}
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button onClick={() => openEdit(bill)} className="p-1.5 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg">
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${bill.name}"?`)) {
                            deleteBill(bill.id);
                            toast.success('Deleted');
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? `Edit ${form.entryType === 'income' ? 'Income' : 'Bill'}` : `Add Recurring ${form.entryType === 'income' ? 'Income' : 'Bill'}`}
      >
        <div className="space-y-4">
          {/* Type toggle (only when adding new) */}
          {!editing && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setForm(f => ({ ...f, entryType: 'bill', category: '' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${form.entryType === 'bill' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                <TrendingDown size={14} className="text-red-500" /> Expense/Bill
              </button>
              <button
                onClick={() => setForm(f => ({ ...f, entryType: 'income', category: '' }))}
                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-sm font-medium transition-colors ${form.entryType === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
              >
                <TrendingUp size={14} className="text-green-500" /> Income
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.entryType === 'income' ? 'Income Name' : 'Bill Name'}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={form.entryType === 'income' ? 'e.g. Salary, Rent Income' : 'e.g. Internet Bill'}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {form.entryType === 'income' ? 'Expected Day' : 'Due Day'} (1–31)
              </label>
              <input
                type="number"
                value={form.dueDay}
                onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                min="1" max="31"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {relevantCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={e => setForm(f => ({ ...f, frequency: e.target.value as RecurringBill['frequency'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              value={form.accountId}
              onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select account</option>
              {data.accounts.map(a => <option key={a.id} value={a.id}>{a.icon} {a.name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`flex-1 px-4 py-2 text-white rounded-lg text-sm ${form.entryType === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {editing ? 'Update' : 'Add'} {form.entryType === 'income' ? 'Income' : 'Bill'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
