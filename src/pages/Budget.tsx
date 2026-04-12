import { useState, useMemo, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Target, AlertTriangle, History, RefreshCw } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, getCurrentMonth, getMonthLabel, getDaysUntil } from '../lib/utils';
import { Modal } from '../components/ui/Modal';
import { budgetsApi } from '../lib/api';
import type { Budget, SavingsGoal } from '../types';
import { toast } from 'sonner';

const PRIORITY_COLORS = { high: 'text-red-600 bg-red-50', medium: 'text-yellow-600 bg-yellow-50', low: 'text-green-600 bg-green-50' };
const GOAL_ICONS = ['🎯','🏠','🚗','✈️','💍','📱','💻','🎓','🏋️','📚','💰','🌊','🎪','🛒'];

interface BudgetForm { categoryId: string; monthlyLimit: string; month: string; alertThreshold: string; recurring: boolean; }
interface GoalForm { name: string; targetAmount: string; currentAmount: string; deadline: string; priority: SavingsGoal['priority']; icon: string; }

export default function Budget() {
  const { data, addBudget, updateBudget, deleteBudget, addGoal, updateGoal, deleteGoal, refreshData } = useApp();
  const { user } = useAuth();
  const currency = user?.currency ?? 'PKR';
  const currentMonth = getCurrentMonth();

  const [tab, setTab] = useState<'current' | 'history'>('current');
  const [historyMonth, setHistoryMonth] = useState(currentMonth);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [budgetForm, setBudgetForm] = useState<BudgetForm>({ categoryId: '', monthlyLimit: '', month: currentMonth, alertThreshold: '80', recurring: false });
  const [goalForm, setGoalForm] = useState<GoalForm>({ name: '', targetAmount: '', currentAmount: '0', deadline: '', priority: 'medium', icon: '🎯' });
  const [rollingOver, setRollingOver] = useState(false);

  // Auto-rollover recurring budgets on mount
  const handleRollover = useCallback(async (month: string, silent = false) => {
    try {
      setRollingOver(true);
      const res = await budgetsApi.rollover(month);
      if (res.created > 0) {
        await refreshData();
        if (!silent) toast.success(`${res.created} recurring budget(s) rolled over for ${getMonthLabel(month)}`);
      } else if (!silent) {
        toast.info('No new budgets to roll over');
      }
    } catch {
      if (!silent) toast.error('Failed to roll over budgets');
    } finally {
      setRollingOver(false);
    }
  }, [refreshData]);

  useEffect(() => {
    // Auto-rollover silently on page load for current month
    handleRollover(currentMonth, true);
  }, [currentMonth, handleRollover]);

  const currentBudgets = useMemo(() => data.budgets.filter(b => b.month === currentMonth).map(b => {
    const cat = data.categories.find(c => c.id === b.categoryId);
    const pct = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
    return { ...b, cat, pct };
  }), [data.budgets, data.categories, currentMonth]);

  const historyBudgets = useMemo(() => data.budgets.filter(b => b.month === historyMonth).map(b => {
    const cat = data.categories.find(c => c.id === b.categoryId);
    const pct = b.monthlyLimit > 0 ? (b.spent / b.monthlyLimit) * 100 : 0;
    return { ...b, cat, pct };
  }), [data.budgets, data.categories, historyMonth]);

  // Get unique months from all budgets, sorted descending
  const availableMonths = useMemo(() => {
    const months = [...new Set(data.budgets.map(b => b.month))].sort((a, b) => b.localeCompare(a));
    return months;
  }, [data.budgets]);

  const totalBudgeted = currentBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const totalSpent = currentBudgets.reduce((s, b) => s + b.spent, 0);

  const historyBudgeted = historyBudgets.reduce((s, b) => s + b.monthlyLimit, 0);
  const historySpent = historyBudgets.reduce((s, b) => s + b.spent, 0);

  const openAddBudget = () => {
    setEditingBudget(null);
    setBudgetForm({ categoryId: '', monthlyLimit: '', month: currentMonth, alertThreshold: '80', recurring: false });
    setShowBudgetModal(true);
  };

  const openEditBudget = (b: Budget) => {
    setEditingBudget(b);
    setBudgetForm({ categoryId: b.categoryId, monthlyLimit: String(b.monthlyLimit), month: b.month, alertThreshold: String(b.alertThreshold), recurring: b.recurring ?? false });
    setShowBudgetModal(true);
  };

  const handleSaveBudget = () => {
    if (!budgetForm.categoryId) { toast.error('Select a category'); return; }
    const limit = parseFloat(budgetForm.monthlyLimit);
    if (!limit || limit <= 0) { toast.error('Enter a valid limit'); return; }
    if (editingBudget) {
      updateBudget(editingBudget.id, { categoryId: budgetForm.categoryId, monthlyLimit: limit, alertThreshold: parseInt(budgetForm.alertThreshold) || 80, recurring: budgetForm.recurring });
      toast.success('Budget updated');
    } else {
      addBudget({ categoryId: budgetForm.categoryId, monthlyLimit: limit, month: budgetForm.month, alertThreshold: parseInt(budgetForm.alertThreshold) || 80, recurring: budgetForm.recurring });
      toast.success(budgetForm.recurring ? 'Recurring budget added — it will auto-carry over each month' : 'Budget added');
    }
    setShowBudgetModal(false);
  };

  const openAddGoal = () => {
    setEditingGoal(null);
    setGoalForm({ name: '', targetAmount: '', currentAmount: '0', deadline: '', priority: 'medium', icon: '🎯' });
    setShowGoalModal(true);
  };

  const openEditGoal = (g: SavingsGoal) => {
    setEditingGoal(g);
    setGoalForm({ name: g.name, targetAmount: String(g.targetAmount), currentAmount: String(g.currentAmount), deadline: g.deadline, priority: g.priority, icon: g.icon });
    setShowGoalModal(true);
  };

  const handleSaveGoal = () => {
    if (!goalForm.name.trim()) { toast.error('Goal name is required'); return; }
    const target = parseFloat(goalForm.targetAmount);
    if (!target || target <= 0) { toast.error('Enter a valid target amount'); return; }
    const current = parseFloat(goalForm.currentAmount) || 0;
    if (editingGoal) {
      updateGoal(editingGoal.id, { name: goalForm.name, targetAmount: target, currentAmount: current, deadline: goalForm.deadline, priority: goalForm.priority, icon: goalForm.icon });
      toast.success('Goal updated');
    } else {
      addGoal({ name: goalForm.name, targetAmount: target, currentAmount: current, deadline: goalForm.deadline, priority: goalForm.priority, icon: goalForm.icon });
      toast.success('Goal added');
    }
    setShowGoalModal(false);
  };

  const expenseCategories = data.categories.filter(c => c.type === 'expense');
  const usedCatIds = new Set(currentBudgets.filter(b => b.id !== editingBudget?.id).map(b => b.categoryId));

  const recurringCount = data.budgets.filter(b => b.month === currentMonth && b.recurring).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Budgets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Monthly Budgets</h2>
            <p className="text-sm text-gray-500">
              {getMonthLabel(currentMonth)} · {formatCurrency(totalSpent, currency)} of {formatCurrency(totalBudgeted, currency)}
              {recurringCount > 0 && <span className="ml-2 text-blue-600 font-medium">· {recurringCount} recurring</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleRollover(currentMonth)}
              disabled={rollingOver}
              title="Roll over recurring budgets to this month"
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={14} className={rollingOver ? 'animate-spin' : ''} /> Rollover
            </button>
            <button onClick={openAddBudget} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              <Plus size={14} /> Add Budget
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button
            onClick={() => setTab('current')}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'current' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            Current Month
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'history' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <History size={13} /> History
          </button>
        </div>

        {tab === 'current' ? (
          currentBudgets.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <Target size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm mb-1">No budgets for this month</p>
              <p className="text-gray-300 text-xs">Add a budget below, or mark one as "recurring" to auto-carry over each month</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentBudgets.map(b => (
                <BudgetCard key={b.id} b={b} currency={currency} onEdit={() => openEditBudget(b)} onDelete={() => { if (confirm('Delete budget?')) { deleteBudget(b.id); toast.success('Budget deleted'); } }} />
              ))}
            </div>
          )
        ) : (
          <div>
            {/* Month selector */}
            <div className="flex items-center gap-3 mb-4">
              <label className="text-sm font-medium text-gray-700">View Month:</label>
              <select
                value={historyMonth}
                onChange={e => setHistoryMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {availableMonths.length === 0 ? (
                  <option value={currentMonth}>{getMonthLabel(currentMonth)}</option>
                ) : (
                  availableMonths.map(m => (
                    <option key={m} value={m}>{getMonthLabel(m)}{m === currentMonth ? ' (Current)' : ''}</option>
                  ))
                )}
              </select>
            </div>

            {historyBudgets.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
                <History size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No budget records for {getMonthLabel(historyMonth)}</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-blue-50 rounded-xl p-4 mb-4 flex flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-blue-500 font-medium">Total Budgeted</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(historyBudgeted, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500 font-medium">Total Spent</p>
                    <p className={`text-lg font-bold ${historySpent > historyBudgeted ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(historySpent, currency)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-500 font-medium">Adherence</p>
                    <p className="text-lg font-bold text-gray-700">{historyBudgeted > 0 ? Math.round((1 - Math.max(0, historySpent - historyBudgeted) / historyBudgeted) * 100) : 100}%</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {historyBudgets.map(b => (
                    <BudgetCard key={b.id} b={b} currency={currency} readonly />
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Goals */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Savings Goals</h2>
          <button onClick={openAddGoal} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus size={14} /> Add Goal
          </button>
        </div>

        {data.savingsGoals.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
            <Target size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No savings goals yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.savingsGoals.map(g => {
              const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
              const daysLeft = g.deadline ? getDaysUntil(g.deadline) : null;
              return (
                <div key={g.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{g.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{g.name}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize ${PRIORITY_COLORS[g.priority]}`}>
                          {g.priority}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEditGoal(g)} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={12} /></button>
                      <button onClick={() => { if (confirm('Delete goal?')) { deleteGoal(g.id); toast.success('Goal deleted'); } }} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={12} /></button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{formatCurrency(g.currentAmount, currency)}</span>
                      <span>{formatCurrency(g.targetAmount, currency)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}% complete</p>
                  </div>
                  {daysLeft !== null && (
                    <p className="text-xs text-gray-400">
                      {daysLeft > 0 ? `${daysLeft} days left` : daysLeft === 0 ? 'Due today' : `${Math.abs(daysLeft)} days overdue`}
                    </p>
                  )}
                  <button
                    onClick={() => {
                      const add = prompt('Add amount to goal:');
                      if (add) { const n = parseFloat(add); if (n > 0) { updateGoal(g.id, { currentAmount: g.currentAmount + n }); toast.success('Goal updated'); }}
                    }}
                    className="mt-2 w-full text-xs text-blue-600 hover:underline text-center"
                  >+ Add funds</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Budget Modal */}
      <Modal open={showBudgetModal} onClose={() => setShowBudgetModal(false)} title={editingBudget ? 'Edit Budget' : 'Add Budget'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
              {expenseCategories.filter(c => editingBudget?.categoryId === c.id || !usedCatIds.has(c.id)).map(c => (
                <button key={c.id} onClick={() => setBudgetForm(f => ({ ...f, categoryId: c.id }))}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs font-medium ${budgetForm.categoryId === c.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <span>{c.icon}</span> {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit</label>
              <input type="number" value={budgetForm.monthlyLimit} onChange={e => setBudgetForm(f => ({ ...f, monthlyLimit: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert at (%)</label>
              <input type="number" value={budgetForm.alertThreshold} onChange={e => setBudgetForm(f => ({ ...f, alertThreshold: e.target.value }))}
                min="1" max="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          {/* Recurring toggle */}
          <div
            onClick={() => setBudgetForm(f => ({ ...f, recurring: !f.recurring }))}
            className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${budgetForm.recurring ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
          >
            <div>
              <p className={`text-sm font-medium ${budgetForm.recurring ? 'text-blue-700' : 'text-gray-700'}`}>
                <RefreshCw size={13} className="inline mr-1.5" />
                Recurring Budget
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Auto-carry over to next month with spent reset to 0</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${budgetForm.recurring ? 'bg-blue-600' : 'bg-gray-200'}`}>
              <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${budgetForm.recurring ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowBudgetModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveBudget} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editingBudget ? 'Update' : 'Add'} Budget</button>
          </div>
        </div>
      </Modal>

      {/* Goal Modal */}
      <Modal open={showGoalModal} onClose={() => setShowGoalModal(false)} title={editingGoal ? 'Edit Goal' : 'Add Savings Goal'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Name</label>
            <input type="text" value={goalForm.name} onChange={e => setGoalForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Emergency Fund"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_ICONS.map(ic => (
                <button key={ic} onClick={() => setGoalForm(f => ({ ...f, icon: ic }))}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border text-xl ${goalForm.icon === ic ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount</label>
              <input type="number" value={goalForm.targetAmount} onChange={e => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Amount</label>
              <input type="number" value={goalForm.currentAmount} onChange={e => setGoalForm(f => ({ ...f, currentAmount: e.target.value }))}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
              <input type="date" value={goalForm.deadline} onChange={e => setGoalForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={goalForm.priority} onChange={e => setGoalForm(f => ({ ...f, priority: e.target.value as SavingsGoal['priority'] }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={() => setShowGoalModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button onClick={handleSaveGoal} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">{editingGoal ? 'Update' : 'Add'} Goal</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── Shared budget card ──────────────────────────────────────────────────────
interface BudgetCardProps {
  b: Budget & { cat?: { icon: string; name: string } | undefined; pct: number };
  currency: string;
  readonly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function BudgetCard({ b, currency, readonly, onEdit, onDelete }: BudgetCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{b.cat?.icon ?? '📦'}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-gray-900">{b.cat?.name ?? 'Unknown'}</p>
              {b.recurring && (
                <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                  <RefreshCw size={10} /> Recurring
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">{formatCurrency(b.spent, currency)} of {formatCurrency(b.monthlyLimit, currency)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {b.pct >= b.alertThreshold && (
            <AlertTriangle size={14} className={b.pct >= 100 ? 'text-red-500' : 'text-yellow-500'} />
          )}
          <span className={`text-sm font-bold ${b.pct >= 100 ? 'text-red-600' : b.pct >= b.alertThreshold ? 'text-yellow-600' : 'text-green-600'}`}>
            {b.pct.toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all ${b.pct >= 100 ? 'bg-red-500' : b.pct >= b.alertThreshold ? 'bg-yellow-500' : 'bg-green-500'}`}
          style={{ width: `${Math.min(b.pct, 100)}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">Remaining: {formatCurrency(Math.max(0, b.monthlyLimit - b.spent), currency)}</span>
        {!readonly && (
          <div className="flex gap-1">
            <button onClick={onEdit} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit2 size={12} /></button>
            <button onClick={onDelete} className="p-1 text-gray-400 hover:text-red-600 rounded"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
