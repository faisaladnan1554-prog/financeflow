import { useMemo } from 'react';
import { Link } from 'wouter';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, Plus, AlertCircle, HandCoins } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatDate, getCurrentMonth, getLast6Months, getMonthLabel, getDaysUntil } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { data } = useApp();
  const currency = user?.currency ?? 'PKR';

  const currentMonth = getCurrentMonth();
  const last6 = getLast6Months();

  const totalAssets = useMemo(() =>
    data.accounts
      .filter(a => a.type !== 'investment')
      .reduce((sum, a) => sum + a.balance, 0), [data.accounts]);

  const totalLiabilities = useMemo(() =>
    data.loans.filter(l => l.direction === 'taken' && l.status === 'active')
      .reduce((sum, l) => sum + l.remainingAmount, 0) +
    data.creditCards.reduce((sum, c) => sum + c.currentBalance, 0),
    [data.loans, data.creditCards]);

  const netWorth = totalAssets - totalLiabilities;

  const monthlyData = useMemo(() => last6.map(month => {
    const income = data.transactions
      .filter(t => t.type === 'income' && t.date.startsWith(month))
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = data.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(month))
      .reduce((sum, t) => sum + t.amount, 0);
    return { month: getMonthLabel(month), income, expense, net: income - expense };
  }), [data.transactions, last6]);

  const currentIncome = monthlyData[5]?.income ?? 0;
  const currentExpense = monthlyData[5]?.expense ?? 0;
  const savingsRate = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome * 100).toFixed(1) : '0';

  const recentTransactions = useMemo(() =>
    [...data.transactions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
    [data.transactions]);

  const currentBudgets = useMemo(() =>
    data.budgets.filter(b => b.month === currentMonth).map(b => {
      const cat = data.categories.find(c => c.id === b.categoryId);
      const pct = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
      return { ...b, catName: cat?.name ?? 'Unknown', catIcon: cat?.icon ?? '📦', pct };
    }).sort((a, b) => b.pct - a.pct).slice(0, 4),
    [data.budgets, data.categories, currentMonth]);

  const upcomingBills = useMemo(() => {
    const today = new Date();
    const in7 = new Date(today); in7.setDate(today.getDate() + 7);
    return data.recurringBills.filter(b => {
      if (!b.isActive) return false;
      const dueDate = new Date(today.getFullYear(), today.getMonth(), b.dueDay);
      return dueDate >= today && dueDate <= in7;
    }).map(b => ({
      ...b,
      daysLeft: getDaysUntil(new Date(today.getFullYear(), today.getMonth(), b.dueDay).toISOString().split('T')[0]),
    })).slice(0, 4);
  }, [data.recurringBills]);

  // Loan repayment widget data
  const loanRepayments = useMemo(() => {
    const activeLoans = data.loans.filter(l => l.direction === 'taken' && l.status === 'active');
    const paidThisMonth = activeLoans.reduce((sum, l) => {
      const monthPaid = l.payments
        .filter(p => p.date && p.date.startsWith(currentMonth))
        .reduce((s, p) => s + p.amount, 0);
      return sum + monthPaid;
    }, 0);
    const totalRemaining = activeLoans.reduce((sum, l) => sum + l.remainingAmount, 0);
    return { activeLoans, paidThisMonth, totalRemaining, count: activeLoans.length };
  }, [data.loans, currentMonth]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{greeting}, {user?.name?.split(' ')[0]}!</h2>
        <p className="text-sm text-gray-500 mt-0.5">Here's your financial overview</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Net Worth</p>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(netWorth, currency)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Assets - Liabilities</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">This Month Income</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(currentIncome, currency)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingUp size={12} className="text-green-500" />
            <p className="text-xs text-gray-400">Savings {savingsRate}%</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">This Month Expense</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(currentExpense, currency)}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <TrendingDown size={12} className="text-red-500" />
            <p className="text-xs text-gray-400">Net {formatCurrency(currentIncome - currentExpense, currency)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-1">Total Accounts</p>
          <p className="text-lg font-bold text-gray-900">{data.accounts.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(totalAssets, currency)} total</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income vs Expense */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Income vs Expense (6 months)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={50}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="#10B981" name="Income" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net cash flow */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Net Cash Flow</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={50}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
              <Area type="monotone" dataKey="net" stroke="#2563EB" strokeWidth={2} fill="url(#netGrad)" name="Net" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Transactions */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Recent Transactions</h3>
            <Link href="/transactions" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-400">No transactions yet</p>
              <Link href="/transactions">
                <button className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto">
                  <Plus size={12} /> Add your first transaction
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map(tx => {
                const cat = data.categories.find(c => c.id === tx.category);
                const account = data.accounts.find(a => a.id === tx.accountId);
                return (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base">
                        {cat?.icon ?? '📦'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{tx.notes || cat?.name || 'Transaction'}</p>
                        <p className="text-xs text-gray-400">{formatDate(tx.date)} · {account?.name}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-600'}`}>
                      {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '↔'}{formatCurrency(tx.amount, currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar widgets */}
        <div className="space-y-4">
          {/* Budget Progress */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Budget Status</h3>
              <Link href="/budget" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {currentBudgets.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No budgets set</p>
            ) : (
              <div className="space-y-3">
                {currentBudgets.map(b => (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{b.catIcon}</span>
                        <span className="text-xs font-medium text-gray-700">{b.catName}</span>
                      </div>
                      <span className="text-xs text-gray-500">{b.pct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${b.pct >= 100 ? 'bg-red-500' : b.pct >= 80 ? 'bg-yellow-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min(b.pct, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Bills */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Upcoming Bills</h3>
              <Link href="/recurring-bills" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>
            {upcomingBills.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No upcoming bills</p>
            ) : (
              <div className="space-y-2">
                {upcomingBills.map(b => (
                  <div key={b.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-gray-800">{b.name}</p>
                      <p className="text-xs text-gray-400">Due in {b.daysLeft} day{b.daysLeft !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-gray-900">{formatCurrency(b.amount, currency)}</p>
                      {b.daysLeft <= 2 && (
                        <div className="flex items-center gap-0.5 justify-end">
                          <AlertCircle size={10} className="text-red-500" />
                          <span className="text-xs text-red-500">Urgent</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loan Repayments Widget */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <HandCoins size={14} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-900">Loan Repayments</h3>
              </div>
              <Link href="/loans" className="text-xs text-blue-600 hover:underline">View all</Link>
            </div>

            {loanRepayments.count === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">No active loans</p>
            ) : (
              <div className="space-y-3">
                {/* Summary row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-orange-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-orange-600 font-medium">Total Remaining</p>
                    <p className="text-sm font-bold text-orange-700">{formatCurrency(loanRepayments.totalRemaining, currency)}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-green-600 font-medium">Paid This Month</p>
                    <p className="text-sm font-bold text-green-700">{formatCurrency(loanRepayments.paidThisMonth, currency)}</p>
                  </div>
                </div>

                {/* Individual loans */}
                <div className="space-y-2">
                  {loanRepayments.activeLoans.slice(0, 3).map(loan => {
                    const paidThisLoan = loan.payments
                      .filter(p => p.date?.startsWith(currentMonth))
                      .reduce((s, p) => s + p.amount, 0);
                    const progress = loan.amount > 0
                      ? Math.round(((loan.amount - loan.remainingAmount) / loan.amount) * 100)
                      : 0;
                    return (
                      <div key={loan.id}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-gray-700 truncate max-w-[120px]">
                            {loan.personName}
                          </p>
                          <span className="text-xs text-gray-500">{progress}% paid</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-400 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-0.5">
                          <p className="text-[10px] text-gray-400">
                            Remaining: {formatCurrency(loan.remainingAmount, currency)}
                          </p>
                          {paidThisLoan > 0 && (
                            <p className="text-[10px] text-green-600">
                              +{formatCurrency(paidThisLoan, currency)} this month
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {loanRepayments.activeLoans.length > 3 && (
                    <p className="text-xs text-gray-400 text-center">
                      +{loanRepayments.activeLoans.length - 3} more loans
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accounts Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Accounts</h3>
          <Link href="/accounts" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            Manage <ArrowRight size={12} />
          </Link>
        </div>
        {data.accounts.length === 0 ? (
          <p className="text-xs text-gray-400">No accounts yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.accounts.map(acc => (
              <div key={acc.id} className="p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{acc.icon}</span>
                  <span className="text-xs font-medium text-gray-600 truncate">{acc.name}</span>
                </div>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(acc.balance, currency)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
