import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Download, FileText } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getCurrentMonth, getMonthLabel, downloadCSV } from '../lib/utils';

export default function Reports() {
  const { data } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 2);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [endMonth, setEndMonth] = useState(getCurrentMonth());

  const getMonthsInRange = () => {
    const months: string[] = [];
    const [sy, sm] = startMonth.split('-').map(Number);
    const [ey, em] = endMonth.split('-').map(Number);
    let y = sy, m = sm;
    while (y < ey || (y === ey && m <= em)) {
      months.push(`${y}-${String(m).padStart(2, '0')}`);
      m++; if (m > 12) { m = 1; y++; }
    }
    return months;
  };

  const months = getMonthsInRange();

  const txInRange = useMemo(() =>
    data.transactions.filter(t => {
      const txMonth = t.date.slice(0, 7);
      return txMonth >= startMonth && txMonth <= endMonth;
    }), [data.transactions, startMonth, endMonth]);

  const totalIncome = txInRange.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txInRange.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = totalIncome - totalExpense;

  const monthlyTrend = useMemo(() => months.map(month => ({
    month: getMonthLabel(month),
    income: txInRange.filter(t => t.type === 'income' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0),
    expense: txInRange.filter(t => t.type === 'expense' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0),
  })), [txInRange, months]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    txInRange.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([catId, amount]) => {
        const cat = data.categories.find(c => c.id === catId);
        return { name: cat?.name ?? 'Unknown', amount, color: cat?.color ?? '#6B7280', icon: cat?.icon ?? '📦' };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [txInRange, data.categories]);

  const handleExportCSV = () => {
    const rows = [
      ['Date', 'Type', 'Category', 'Account', 'Amount', 'Notes'],
      ...txInRange.map(t => {
        const cat = data.categories.find(c => c.id === t.category);
        const acc = data.accounts.find(a => a.id === t.accountId);
        return [t.date, t.type, cat?.name ?? '', acc?.name ?? '', String(t.amount), t.notes];
      }),
    ];
    downloadCSV(`financeflow_report_${startMonth}_${endMonth}.csv`, rows);
  };

  const handlePrint = () => window.print();

  return (
    <div className="p-4 md:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Reports & Analytics</h2>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            <FileText size={14} /> Print
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-700">Date Range:</span>
        <input type="month" value={startMonth} onChange={e => setStartMonth(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="month" value={endMonth} onChange={e => setEndMonth(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <span className="text-xs text-gray-400">{txInRange.length} transactions</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Income</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIncome, currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Expense</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalExpense, currency)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Net Savings</p>
          <p className={`text-xl font-bold ${net >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(net, currency)}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyTrend} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} width={50}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)} />
              <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" fill="#10B981" name="Income" radius={[3, 3, 0, 0]} />
              <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Expense by Category</h3>
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No expense data</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v), currency)} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Expense Breakdown by Category</h3>
        </div>
        {categoryBreakdown.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No data</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Category</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">Amount</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">% of Total</th>
                <th className="px-4 py-3 w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categoryBreakdown.map(cat => {
                const pct = totalExpense > 0 ? (cat.amount / totalExpense * 100) : 0;
                return (
                  <tr key={cat.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-sm">{cat.icon}</span>
                        <span className="text-gray-700">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(cat.amount, currency)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{pct.toFixed(1)}%</td>
                    <td className="px-4 py-3">
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-gray-200 bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                <td className="px-4 py-3 text-right font-bold text-gray-900">{formatCurrency(totalExpense, currency)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-500">100%</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
