import { useState, useEffect, useMemo } from 'react';
import { Link } from 'wouter';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Brain, Sparkles, AlertTriangle, TrendingUp, Target, Settings, RefreshCw, CheckCircle, ChevronRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { aiApi } from '../lib/api';
import { getLast6Months, getMonthLabel, formatCurrency, getCurrentMonth } from '../lib/utils';
import { toast } from 'sonner';
import type { AIStrategy } from '../types';

// ── Health config ───────────────────────────────────────────────────────────
function getHealthConfig(score: number) {
  if (score >= 80) return { bg: 'bg-green-500', text: 'Excellent', emoji: '🏆', ring: '#22c55e' };
  if (score >= 60) return { bg: 'bg-yellow-500', text: 'Good', emoji: '👍', ring: '#eab308' };
  if (score >= 40) return { bg: 'bg-orange-500', text: 'Warning', emoji: '⚠️', ring: '#f97316' };
  return { bg: 'bg-red-500', text: 'Critical', emoji: '🚨', ring: '#ef4444' };
}

function getRiskColor(risk: string) {
  switch (risk) {
    case 'low': return 'bg-green-100 text-green-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'high': return 'bg-orange-100 text-orange-700';
    case 'critical': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'border-red-200 bg-red-50';
    case 'medium': return 'border-yellow-200 bg-yellow-50';
    case 'low': return 'border-green-200 bg-green-50';
    default: return 'border-gray-200 bg-gray-50';
  }
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700';
    case 'medium': return 'bg-yellow-100 text-yellow-700';
    case 'low': return 'bg-green-100 text-green-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// ── Circular gauge ──────────────────────────────────────────────────────────
function HealthGauge({ score, config }: { score: number; config: ReturnType<typeof getHealthConfig> }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={radius}
          fill="none"
          stroke={config.ring}
          strokeWidth="12"
          strokeDasharray={`${progress} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900">{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function AIStrategy() {
  const { data } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';

  const [strategy, setStrategy] = useState<AIStrategy | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [goals, setGoals] = useState('');

  // Check if API key is configured
  useEffect(() => {
    aiApi.getSettings()
      .then(s => setHasApiKey(s.hasApiKey))
      .catch(() => setHasApiKey(false));
  }, []);

  // Calculate financial summary from last 3 months of transactions
  const financialSummary = useMemo(() => {
    const last3Months = getLast6Months().slice(3); // last 3 months
    const txs = data.transactions;

    let totalIncome = 0;
    let totalExpenses = 0;
    const expensesByCategory: Record<string, number> = {};

    for (const tx of txs) {
      const month = tx.date.slice(0, 7);
      if (!last3Months.includes(month)) continue;

      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else if (tx.type === 'expense') {
        totalExpenses += tx.amount;
        // Look up category name
        const cat = data.categories.find(c => c.id === tx.category);
        const catName = cat?.name ?? tx.category ?? 'Other';
        expensesByCategory[catName] = (expensesByCategory[catName] ?? 0) + tx.amount;
      }
    }

    const monthCount = last3Months.length || 1;
    const avgIncome = totalIncome / monthCount;
    const avgExpenses = totalExpenses / monthCount;
    const totalSavings = data.accounts.reduce((sum, a) => sum + a.balance, 0);
    const totalDebt = data.loans
      .filter(l => l.direction === 'taken' && l.status === 'active')
      .reduce((sum, l) => sum + l.remainingAmount, 0);

    // Average expense by category
    const avgExpensesByCategory: Record<string, number> = {};
    for (const [cat, amt] of Object.entries(expensesByCategory)) {
      avgExpensesByCategory[cat] = Math.round(amt / monthCount);
    }

    return {
      avgIncome: Math.round(avgIncome),
      avgExpenses: Math.round(avgExpenses),
      totalSavings,
      totalDebt,
      expensesByCategory: avgExpensesByCategory,
      transactionCount: txs.length,
    };
  }, [data.transactions, data.categories, data.accounts, data.loans]);

  // Pre-fill income from calculated summary
  useEffect(() => {
    if (financialSummary.avgIncome > 0 && !monthlyIncome) {
      setMonthlyIncome(financialSummary.avgIncome.toString());
    }
  }, [financialSummary.avgIncome]);

  const handleGenerate = async () => {
    if (!hasApiKey) {
      toast.error('Please configure your AI API key in Settings first');
      return;
    }

    setLoading(true);
    try {
      const result = await aiApi.generateStrategy({
        income: parseFloat(monthlyIncome) || financialSummary.avgIncome,
        expenses: financialSummary.expensesByCategory,
        savings: financialSummary.totalSavings,
        transactions: financialSummary.transactionCount,
        goals: goals || 'Financial freedom and savings',
        currency,
        currentMonth: getCurrentMonth(),
        debt: financialSummary.totalDebt,
      });
      setStrategy(result);
      toast.success('AI strategy generated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate strategy');
    } finally {
      setLoading(false);
    }
  };

  const healthConfig = strategy ? getHealthConfig(strategy.healthScore) : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
          <Brain size={22} className="text-purple-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">AI Financial Advisor</h1>
          <p className="text-sm text-gray-500">Powered by AI — personalized financial strategy</p>
        </div>
        {hasApiKey === false && (
          <Link to="/settings" className="ml-auto">
            <button className="flex items-center gap-2 px-3 py-1.5 border border-purple-300 text-purple-700 rounded-lg text-sm hover:bg-purple-50">
              <Settings size={14} /> Configure API Key
            </button>
          </Link>
        )}
      </div>

      {/* No API Key Warning */}
      {hasApiKey === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">AI API Key Not Configured</p>
            <p className="text-sm text-amber-700 mt-0.5">
              To use the AI Financial Advisor, please add your OpenAI or Anthropic API key in{' '}
              <Link to="/settings" className="underline font-medium">Settings → AI Configuration</Link>.
            </p>
          </div>
        </div>
      )}

      {/* Health Dashboard — shown after strategy is generated */}
      {strategy && healthConfig && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Financial Health Dashboard</h2>
          <div className="flex flex-wrap gap-6 items-center">
            {/* Gauge */}
            <div className="flex flex-col items-center gap-2">
              <HealthGauge score={strategy.healthScore} config={healthConfig} />
              <span className={`px-3 py-1 rounded-full text-sm font-semibold text-white ${healthConfig.bg}`}>
                {healthConfig.emoji} {healthConfig.text}
              </span>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 gap-3 min-w-[200px]">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Bankruptcy Risk</p>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRiskColor(strategy.bankruptcyRisk)}`}>
                  {strategy.bankruptcyRiskLabel}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Savings Rate</p>
                <p className="text-lg font-bold text-gray-900 mt-0.5">{strategy.savingsRate.toFixed(1)}%</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Financial Freedom</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  {strategy.monthsToFreedom < 12
                    ? `${strategy.monthsToFreedom} months`
                    : `${Math.round(strategy.monthsToFreedom / 12)} years`}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500">Monthly Target</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">{formatCurrency(strategy.monthlyTarget, currency)}</p>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">{strategy.summary}</p>
          </div>
        </div>
      )}

      {/* Generate Strategy */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-900">
            {strategy ? 'Regenerate Strategy' : 'Generate AI Strategy'}
          </h2>
        </div>

        {/* Financial summary chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
            Avg Income: {formatCurrency(financialSummary.avgIncome, currency)}/mo
          </span>
          <span className="px-2 py-1 bg-red-50 text-red-700 rounded-md text-xs">
            Avg Expenses: {formatCurrency(financialSummary.avgExpenses, currency)}/mo
          </span>
          <span className="px-2 py-1 bg-green-50 text-green-700 rounded-md text-xs">
            Total Savings: {formatCurrency(financialSummary.totalSavings, currency)}
          </span>
          {financialSummary.totalDebt > 0 && (
            <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md text-xs">
              Total Debt: {formatCurrency(financialSummary.totalDebt, currency)}
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Income ({currency})</label>
            <input
              type="number"
              value={monthlyIncome}
              onChange={e => setMonthlyIncome(e.target.value)}
              placeholder="Enter your monthly income"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Financial Goals</label>
            <textarea
              value={goals}
              onChange={e => setGoals(e.target.value)}
              placeholder="e.g., Save for a house, pay off debt, invest for retirement..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || hasApiKey === false}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <><RefreshCw size={15} className="animate-spin" /> Analyzing your finances...</>
            ) : (
              <><Sparkles size={15} /> {strategy ? 'Regenerate Strategy' : 'Generate AI Strategy'}</>
            )}
          </button>
        </div>
      </div>

      {/* Strategy Results */}
      {strategy && (
        <>
          {/* Motivational Message */}
          <div className={`rounded-xl p-4 border ${healthConfig?.bg === 'bg-green-500' ? 'bg-green-50 border-green-200' : healthConfig?.bg === 'bg-yellow-500' ? 'bg-yellow-50 border-yellow-200' : healthConfig?.bg === 'bg-orange-500' ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-lg font-medium text-gray-800">
              {healthConfig?.emoji} {strategy.motivationalMessage}
            </p>
          </div>

          {/* Action Items */}
          {strategy.actionItems && strategy.actionItems.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900">Action Items</h2>
              </div>
              <div className="space-y-3">
                {strategy.actionItems.map((item, i) => (
                  <div key={i} className={`rounded-lg border p-3 ${getPriorityColor(item.priority)}`}>
                    <div className="flex items-start gap-3">
                      <CheckCircle size={16} className="mt-0.5 text-gray-400 shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-gray-900">{item.title}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getPriorityBadge(item.priority)}`}>
                            {item.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">{item.description}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <ChevronRight size={10} /> Impact: {item.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Budget Recommendations */}
          {strategy.budgetRecommendations && strategy.budgetRecommendations.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-green-500" />
                <h2 className="text-sm font-semibold text-gray-900">Budget Recommendations</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-xs text-gray-500 font-medium">Category</th>
                      <th className="text-right py-2 text-xs text-gray-500 font-medium">Current</th>
                      <th className="text-right py-2 text-xs text-gray-500 font-medium">Recommended</th>
                      <th className="text-right py-2 text-xs text-gray-500 font-medium">Savings</th>
                      <th className="text-left py-2 text-xs text-gray-500 font-medium pl-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.budgetRecommendations.map((rec, i) => {
                      const savings = rec.current - rec.recommended;
                      return (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 font-medium text-gray-900">{rec.category}</td>
                          <td className="py-2 text-right text-red-600">{formatCurrency(rec.current, currency)}</td>
                          <td className="py-2 text-right text-green-600">{formatCurrency(rec.recommended, currency)}</td>
                          <td className={`py-2 text-right font-medium ${savings > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {savings > 0 ? `+${formatCurrency(savings, currency)}` : '—'}
                          </td>
                          <td className="py-2 text-xs text-gray-500 pl-4">{rec.action}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Financial Projections Chart */}
          {strategy.projections && strategy.projections.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={16} className="text-blue-500" />
                <h2 className="text-sm font-semibold text-gray-900">12-Month Financial Projection</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={strategy.projections} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={m => getMonthLabel(m).split(' ')[0]}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: unknown) => formatCurrency(Number(v), currency).replace(/[^0-9KkMm.]/g, '').slice(0, 6)}
                    width={60}
                  />
                  <Tooltip
                    formatter={(v: unknown) => formatCurrency(Number(v), currency)}
                    labelFormatter={m => getMonthLabel(m)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="income" stroke="#3b82f6" fill="url(#colorIncome)" strokeWidth={2} name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#colorExpenses)" strokeWidth={2} name="Expenses" />
                  <Area type="monotone" dataKey="cumulative" stroke="#22c55e" fill="url(#colorCumulative)" strokeWidth={2} name="Cumulative Savings" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
