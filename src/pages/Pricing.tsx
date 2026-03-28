import { useState, useEffect } from 'react';
import { Check, Zap, CreditCard, Loader2, X, Building, Smartphone, Globe, Banknote } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { plansApi, paymentsApi } from '../lib/api';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';
import type { Plan } from '../types';

const PAYMENT_METHODS = [
  { id: 'stripe',        label: 'Credit / Debit Card',  icon: CreditCard,  color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { id: 'jazzcash',      label: 'JazzCash',              icon: Smartphone,  color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { id: 'easypaisa',     label: 'EasyPaisa',             icon: Smartphone,  color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200' },
  { id: 'paypal',        label: 'PayPal',                icon: Globe,       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
  { id: 'bank_transfer', label: 'Bank Transfer',         icon: Building,    color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200' },
];

const BANK_DETAILS = {
  bankName: 'Meezan Bank',
  accountTitle: 'FinanceFlow Pvt Ltd',
  accountNumber: '0123456789012345',
  iban: 'PK00MEZN0001234567890123',
};

interface PaymentModalProps {
  plan: Plan;
  onClose: () => void;
  onSuccess: (updatedUser: import('../types').User) => void;
}

function PaymentModal({ plan, onClose, onSuccess }: PaymentModalProps) {
  const [method, setMethod] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [processing, setProcessing] = useState(false);

  const handlePay = async () => {
    if (!method) { toast.error('Please select a payment method'); return; }

    setProcessing(true);
    try {
      let updatedUser;
      if (method === 'bank_transfer') {
        if (!transactionRef.trim()) { toast.error('Please enter transaction reference'); setProcessing(false); return; }
        updatedUser = await paymentsApi.manualPayment(plan.id, transactionRef, method);
      } else if (method === 'stripe') {
        const res = await paymentsApi.initStripe(plan.id, plan.price);
        window.open(res.checkoutUrl, '_blank');
        // For demo: upgrade directly
        updatedUser = await plansApi.upgrade(plan.id, method);
      } else if (method === 'jazzcash') {
        const res = await paymentsApi.initJazzCash(plan.id, plan.price);
        // Build a form and post to JazzCash URL
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = res.postUrl;
        form.target = '_blank';
        Object.entries(res.params).forEach(([k, v]) => {
          const input = document.createElement('input');
          input.type = 'hidden'; input.name = k; input.value = v as string;
          form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
        // For demo: upgrade directly
        updatedUser = await plansApi.upgrade(plan.id, method);
      } else if (method === 'easypaisa') {
        const res = await paymentsApi.initEasyPaisa(plan.id, plan.price);
        window.open(res.redirectUrl, '_blank');
        updatedUser = await plansApi.upgrade(plan.id, method);
      } else if (method === 'paypal') {
        const res = await paymentsApi.initStripe(plan.id, plan.price); // reuse for demo
        window.open(res.checkoutUrl, '_blank');
        updatedUser = await plansApi.upgrade(plan.id, method);
      } else {
        updatedUser = await plansApi.upgrade(plan.id, method);
      }
      toast.success(`Successfully upgraded to ${plan.name} plan!`);
      onSuccess(updatedUser);
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">Upgrade to {plan.name}</h3>
            <p className="text-sm text-gray-500">
              {plan.price > 0 ? `Rs ${plan.price.toLocaleString()} / month` : plan.price === 0 ? 'Free' : 'Contact us'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Select Payment Method</p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(pm => {
                const Icon = pm.icon;
                return (
                  <button
                    key={pm.id}
                    onClick={() => setMethod(pm.id)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      method === pm.id
                        ? `${pm.bg} ${pm.border} ${pm.color}`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="truncate">{pm.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {method === 'stripe' && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
              <p className="text-sm text-indigo-700">You will be redirected to Stripe's secure checkout to complete payment.</p>
            </div>
          )}

          {(method === 'jazzcash' || method === 'easypaisa') && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700">You will be redirected to {method === 'jazzcash' ? 'JazzCash' : 'EasyPaisa'} to complete payment.</p>
            </div>
          )}

          {method === 'paypal' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">You will be redirected to PayPal to complete payment.</p>
            </div>
          )}

          {method === 'bank_transfer' && (
            <div className="space-y-2">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <p className="font-medium text-gray-900 mb-2 flex items-center gap-1"><Banknote size={14} /> Bank Transfer Details</p>
                <div className="space-y-1 text-gray-600">
                  <p>Bank: <span className="font-medium text-gray-900">{BANK_DETAILS.bankName}</span></p>
                  <p>Account Title: <span className="font-medium text-gray-900">{BANK_DETAILS.accountTitle}</span></p>
                  <p>Account No: <span className="font-medium text-gray-900">{BANK_DETAILS.accountNumber}</span></p>
                  <p>IBAN: <span className="font-medium text-gray-900">{BANK_DETAILS.iban}</span></p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Reference Number</label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={e => setTransactionRef(e.target.value)}
                  placeholder="Enter your transaction reference"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <button
            onClick={handlePay}
            disabled={processing || !method}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {processing ? (
              <><Loader2 size={16} className="animate-spin" /> Processing...</>
            ) : (
              <><Zap size={16} /> Complete Payment</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function Pricing() {
  const { user, updateUser } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<'free' | 'basic' | 'pro' | 'enterprise'>(user?.plan ?? 'free');
  const [planExpiry, setPlanExpiry] = useState<string | null>(user?.planExpiry ?? null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    plansApi.getAll()
      .then(res => {
        setPlans(res.plans);
        setCurrentPlan((res.currentPlan as 'free' | 'basic' | 'pro' | 'enterprise') ?? 'free');
        setPlanExpiry(res.planExpiry);
      })
      .catch(() => toast.error('Failed to load plans'))
      .finally(() => setLoading(false));
  }, []);

  const handleSuccess = (updatedUser: import('../types').User) => {
    setCurrentPlan(updatedUser.plan ?? 'free');
    setPlanExpiry(updatedUser.planExpiry ?? null);
    updateUser({ plan: updatedUser.plan, planExpiry: updatedUser.planExpiry });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 size={24} className="animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="text-center pb-2">
        <h1 className="text-2xl font-bold text-gray-900">Choose Your Plan</h1>
        <p className="text-gray-500 mt-1">Upgrade to unlock powerful features for better financial management</p>
        {currentPlan && currentPlan !== 'free' && (
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 bg-purple-50 border border-purple-200 rounded-full text-sm text-purple-700">
            <Zap size={14} />
            Current plan: <strong className="capitalize">{currentPlan}</strong>
            {planExpiry && <span>— expires {new Date(planExpiry).toLocaleDateString()}</span>}
          </div>
        )}
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map(plan => {
          const isActive = currentPlan === plan.id;
          const isFree = plan.price === 0;
          const isEnterprise = plan.price === -1;

          return (
            <div
              key={plan.id}
              className={`relative bg-white rounded-2xl border-2 p-5 flex flex-col transition-shadow hover:shadow-md ${
                plan.popular
                  ? 'border-purple-500 shadow-lg shadow-purple-100'
                  : isActive
                  ? 'border-blue-500'
                  : 'border-gray-200'
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-purple-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              {/* Current badge */}
              {isActive && (
                <div className="absolute -top-3 right-3 px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full">
                  Current
                </div>
              )}

              <div className="mb-4">
                <h3 className="font-bold text-gray-900 text-lg">{plan.name}</h3>
                <div className="mt-1">
                  {isFree ? (
                    <span className="text-2xl font-bold text-gray-900">Free</span>
                  ) : isEnterprise ? (
                    <span className="text-2xl font-bold text-gray-900">Custom</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gray-900">
                        {formatCurrency(plan.price, plan.currency)}
                      </span>
                      <span className="text-gray-400 text-sm">/ {plan.period}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Features */}
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check size={14} className="mt-0.5 text-green-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isActive ? (
                <div className="w-full text-center py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg">
                  Active Plan
                </div>
              ) : isEnterprise ? (
                <a
                  href="mailto:support@financeflow.app"
                  className="w-full text-center py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 block"
                >
                  Contact Us
                </a>
              ) : isFree ? (
                <button
                  onClick={() => plansApi.upgrade('free', 'none').then(u => handleSuccess(u)).catch(e => toast.error(e.message))}
                  className="w-full py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Downgrade to Free
                </button>
              ) : (
                <button
                  onClick={() => setSelectedPlan(plan)}
                  className={`w-full py-2 text-sm font-medium rounded-lg text-white ${
                    plan.popular ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  Upgrade to {plan.name}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Methods */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Accepted Payment Methods</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {PAYMENT_METHODS.map(pm => {
            const Icon = pm.icon;
            return (
              <div key={pm.id} className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border ${pm.bg} ${pm.border}`}>
                <Icon size={20} className={pm.color} />
                <span className="text-xs font-medium text-gray-700 text-center">{pm.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment modal */}
      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
