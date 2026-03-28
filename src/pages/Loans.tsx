import { useState } from 'react';
import { Plus, Edit2, Trash2, DollarSign } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, getDaysUntil } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import type { Loan } from '../types';
import { toast } from 'sonner';

interface LoanForm { direction: 'given' | 'taken'; personName: string; amount: string; dueDate: string; interestRate: string; notes: string; }
const emptyForm: LoanForm = { direction: 'given', personName: '', amount: '', dueDate: '', interestRate: '0', notes: '' };

export default function Loans() {
  const { data, addLoan, updateLoan, deleteLoan, recordLoanPayment } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [showModal, setShowModal] = useState(false);
  const [showPayment, setShowPayment] = useState<Loan | null>(null);
  const [editing, setEditing] = useState<Loan | null>(null);
  const [form, setForm] = useState<LoanForm>(emptyForm);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [activeTab, setActiveTab] = useState<'given' | 'taken'>('given');

  const givenLoans = data.loans.filter(l => l.direction === 'given');
  const takenLoans = data.loans.filter(l => l.direction === 'taken');
  const shownLoans = activeTab === 'given' ? givenLoans : takenLoans;

  const totalGiven = givenLoans.filter(l => l.status === 'active').reduce((s, l) => s + l.remainingAmount, 0);
  const totalTaken = takenLoans.filter(l => l.status === 'active').reduce((s, l) => s + l.remainingAmount, 0);

  const openAdd = () => { setEditing(null); setForm({ ...emptyForm, direction: activeTab }); setShowModal(true); };
  const openEdit = (l: Loan) => {
    setEditing(l);
    setForm({ direction: l.direction, personName: l.personName, amount: String(l.amount), dueDate: l.dueDate, interestRate: String(l.interestRate), notes: l.notes });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.personName.trim()) { toast.error('Person name is required'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    if (editing) {
      updateLoan(editing.id, { direction: form.direction, personName: form.personName, amount, dueDate: form.dueDate, interestRate: parseFloat(form.interestRate) || 0, notes: form.notes });
      toast.success('Loan updated');
    } else {
      addLoan({ direction: form.direction, personName: form.personName, amount, dueDate: form.dueDate, interestRate: parseFloat(form.interestRate) || 0, notes: form.notes, status: 'active' });
      toast.success('Loan added');
    }
    setShowModal(false);
  };

  const handlePayment = () => {
    if (!showPayment) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toast.error('Enter a valid payment amount'); return; }
    if (amount > showPayment.remainingAmount) { toast.error('Payment exceeds remaining amount'); return; }
    recordLoanPayment(showPayment.id, amount, paymentNote);
    toast.success('Payment recorded');
    setShowPayment(null);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const handleSettle = (l: Loan) => {
    if (confirm('Mark this loan as settled?')) {
      updateLoan(l.id, { status: 'settled', remainingAmount: 0 });
      toast.success('Loan marked as settled');
    }
  };

  return (
    <div className="p-4 md:p-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Loans Given (Receivable)</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalGiven, currency)}</p>
          <p className="text-xs text-gray-400">{givenLoans.filter(l => l.status === 'active').length} active</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Loans Taken (Payable)</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalTaken, currency)}</p>
          <p className="text-xs text-gray-400">{takenLoans.filter(l => l.status === 'active').length} active</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['given', 'taken'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              {t === 'given' ? 'Given' : 'Taken'}
            </button>
          ))}
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus size={14} /> Add Loan
        </button>
      </div>

      {/* Loans List */}
      {shownLoans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <DollarSign size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">No {activeTab} loans</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shownLoans.map(l => {
            const daysLeft = l.dueDate ? getDaysUntil(l.dueDate) : null;
            const pct = l.amount > 0 ? ((l.amount - l.remainingAmount) / l.amount) * 100 : 0;
            return (
              <div key={l.id} className={`bg-white rounded-xl border p-4 ${l.status === 'settled' ? 'border-gray-100 opacity-70' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{l.personName}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${l.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {l.status}
                      </span>
                    </div>
                    {l.notes && <p className="text-xs text-gray-400 mt-0.5">{l.notes}</p>}
                    {l.interestRate > 0 && <p className="text-xs text-gray-400">{l.interestRate}% interest</p>}
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${activeTab === 'given' ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(l.remainingAmount, currency)}
                    </p>
                    <p className="text-xs text-gray-400">of {formatCurrency(l.amount, currency)}</p>
                    {daysLeft !== null && l.status === 'active' && (
                      <p className={`text-xs mt-0.5 ${daysLeft < 0 ? 'text-red-500' : daysLeft <= 7 ? 'text-yellow-500' : 'text-gray-400'}`}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
                      </p>
                    )}
                  </div>
                </div>

                {l.amount > 0 && (
                  <div className="mb-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct.toFixed(0)}% repaid</p>
                  </div>
                )}

                {/* Payment history */}
                {l.payments.length > 0 && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs font-medium text-gray-500 mb-1">Payments:</p>
                    {l.payments.slice(-3).map(p => (
                      <div key={p.id} className="flex justify-between text-xs text-gray-500">
                        <span>{formatDate(p.date)} {p.notes && `· ${p.notes}`}</span>
                        <span className="font-medium">{formatCurrency(p.amount, currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {l.status === 'active' && (
                  <div className="flex gap-2">
                    <button onClick={() => { setShowPayment(l); setPaymentAmount(''); setPaymentNote(''); }}
                      className="flex-1 text-xs text-blue-600 border border-blue-200 py-1.5 rounded-lg hover:bg-blue-50 font-medium">
                      Record Payment
                    </button>
                    <button onClick={() => handleSettle(l)}
                      className="flex-1 text-xs text-green-600 border border-green-200 py-1.5 rounded-lg hover:bg-green-50 font-medium">
                      Mark Settled
                    </button>
                    <button onClick={() => openEdit(l)} className="p-1.5 text-gray-400 hover:text-blue-600 border border-gray-200 rounded-lg">
                      <Edit2 size={12} />
                    </button>
                    <button onClick={() => { if (confirm('Delete loan?')) { deleteLoan(l.id); toast.success('Loan deleted'); } }}
                      className="p-1.5 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg">
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Loan' : 'Add Loan'}>
        <div className="space-y-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {(['given', 'taken'] as const).map(d => (
              <button key={d} onClick={() => setForm(f => ({ ...f, direction: d }))}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium capitalize ${form.direction === d ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                {d === 'given' ? 'Loan Given' : 'Loan Taken'}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
            <input type="text" value={form.personName} onChange={e => setForm(f => ({ ...f, personName: e.target.value }))}
              placeholder="e.g. John Doe"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate (%)</label>
              <input type="number" value={form.interestRate} onChange={e => setForm(f => ({ ...f, interestRate: e.target.value }))}
                placeholder="0" min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
            <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional notes..." rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editing ? 'Update' : 'Add'} Loan</button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal open={!!showPayment} onClose={() => setShowPayment(null)} title="Record Payment" size="sm">
        {showPayment && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">{showPayment.personName}</p>
              <p className="text-sm text-gray-500">Remaining: {formatCurrency(showPayment.remainingAmount, currency)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
              <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                placeholder="0.00" max={showPayment.remainingAmount}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <input type="text" value={paymentNote} onChange={e => setPaymentNote(e.target.value)}
                placeholder="Payment note"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowPayment(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
              <button onClick={handlePayment} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Record</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
