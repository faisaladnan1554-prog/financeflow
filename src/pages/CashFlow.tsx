import { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getLast6Months, getMonthLabel, getCurrentMonth } from '../lib/utils';

export default function CashFlow() {
  const { data } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';
  const last6 = getLast6Months();

  const monthlyData = useMemo(() => last6.map(month => {
    const income = data.transactions.filter(t => t.type === 'income' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
    const expense = data.transactions.filter(t => t.type === 'expense' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0);
    return { month: getMonthLabel(month), income, expense, net: income - expense };
  }), [data.transactions, last6]);

  // Weekly breakdown for current month
  const currentMonth = getCurrentMonth();
  const weeklyData = useMemo(() => {
    const weeks = [
      { label: 'Week 1', start: 1, end: 7 },
      { label: 'Week 2', start: 8, end: 14 },
      { label: 'Week 3', start: 15, end: 21 },
      { label: 'Week 4', start: 22, end: 31 },
    ];
    return weeks.map(w => {
      const txs = data.transactions.filter(t => {
        if (!t.date.startsWith(currentMonth)) return false;
        const day = parseInt(t.date.split('-')[2]);
        return day >= w.start && day <= w.end;
      });
      return {
        label: w.label,
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
        expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [data.transactions, currentMonth]);

  // Category spending breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    data.transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = data.categories.find(c => c.id === catId);
        return { name: cat?.name ?? 'Unknown', icon: cat?.icon ?? '📦', amount, color: cat?.color ?? '#6B7280' };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [data.transactions, data.categories, currentMonth]);

  // Projected balance
  // currentData unused, projecting from averages only
  const avgMonthlyIncome = monthlyData.reduce((s, m) => s + m.income, 0) / 6;
  const avgMonthlyExpense = monthlyData.reduce((s, m) => s + m.expense, 0) / 6;
  const totalBalance = data.accounts.reduce((s, a) => s + a.balance, 0);
  const projectedEndOfMonth = totalBalance + (avgMonthlyIncome - avgMonthlyExpense);

  const totalIncome6 = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpense6 = monthlyData.reduce((s, m) => s + m.expense, 0);
  const savingsRate = totalIncome6 > 0 ? ((totalIncome6 - totalExpense6) / totalIncome6 * 100).toFixed(1) : '0';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Cash Flow Analysis</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Monthly Income</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(avgMonthlyIncome, currency)}</p>
          <p className="text-xs text-gray-400">6-month avg</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avg Monthly Expense</p>
          <p className="text-lg font-bold text-red-600">{formatCurrency(avgMonthlyExpense, currency)}</p>
          <p className="text-xs text-gray-400">6-month avg</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Savings Rate</p>
          <p className="text-lg font-bold text-blue-600">{savingsRate}%</p>
          <p className="text-xs text-gray-400">6-month average</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Projected Balance</p>
          <p className={`text-lg font-bold ${projectedEndOfMonth >= totalBalance ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(projectedEndOfMonth, currency)}
          </p>
          <p className="text-xs text-gray-400">End of month</p>
        </div>
      </div>

      {/* 6-Month Trend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">6-Month Income vs Expense Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyData}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={55}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
            <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} fill="url(#incomeGrad)" name="Income" />
            <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fill="url(#expenseGrad)" name="Expense" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Net Cash Flow */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Net Cash Flow</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={55}
              tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
            <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
            <Bar dataKey="net" fill="#2563EB" name="Net Flow" radius={[4, 4, 0, 0]}
              label={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Weekly Breakdown (This Month)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} width={55}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="income" fill="#10B981" name="Income" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Spending Categories */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Spending Categories (This Month)</h3>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No expense data this month</p>
          ) : (
            <div className="space-y-3">
              {categoryData.map(cat => {
                const total = categoryData.reduce((s, c) => s + c.amount, 0);
                const pct = total > 0 ? (cat.amount / total) * 100 : 0;
                return (
                  <div key={cat.name}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{pct.toFixed(0)}%</span>
                        <span className="text-xs font-semibold text-gray-900">{formatCurrency(cat.amount, currency)}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
