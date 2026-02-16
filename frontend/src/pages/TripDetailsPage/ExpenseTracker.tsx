/**
 * ExpenseTracker
 *
 * Always visible in OverviewTab across all trip phases.
 * Lets users log expenses during planning, the trip itself,
 * and review them after completion.
 *
 * Features:
 *   - Add expense: amount, currency, category, description, date
 *   - Delete individual expenses
 *   - Total spent vs trip budget with a colour-coded progress bar
 *   - Per-category spend breakdown
 *   - Persists to trip_metadata.expenses via updateTrip()
 *
 * State strategy (same as PreTripChecklist):
 *   - Initialise from trip.trip_metadata.expenses if it exists
 *   - Optimistic local update first, then save to backend
 *   - On error: roll back to pre-action state
 *
 * Week 6 Day 1 fix:
 *   - totalSpent and categoryTotals now call convertToUSD() for every
 *     expense before summing, so mixed-currency trips (e.g. 5000 JPY +
 *     50 SGD) produce a correct USD-normalised total instead of a raw sum.
 *   - trip.budget is treated as USD (matches the $ sign already in the UI).
 *   - Individual expense amounts still display in their original currency.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { convertToUSD } from '../../utils/currency';
import type { Trip, Expense, ExpenseCategory } from '../../types';

// ── Category config ───────────────────────────────────────────
const CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
  textColor: string;
}[] = [
  { value: 'food',          label: 'Food & Drink',  icon: '🍜', color: 'bg-orange-100', textColor: 'text-orange-700' },
  { value: 'transport',     label: 'Transport',     icon: '🚌', color: 'bg-blue-100',   textColor: 'text-blue-700'   },
  { value: 'activities',    label: 'Activities',    icon: '🎡', color: 'bg-purple-100', textColor: 'text-purple-700' },
  { value: 'shopping',      label: 'Shopping',      icon: '🛍️', color: 'bg-pink-100',   textColor: 'text-pink-700'   },
  { value: 'accommodation', label: 'Accommodation', icon: '🏨', color: 'bg-green-100',  textColor: 'text-green-700'  },
  { value: 'other',         label: 'Other',         icon: '📦', color: 'bg-gray-100',   textColor: 'text-gray-600'   },
];

function getCategoryConfig(value: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

// ── Currency options (add/edit form dropdown) ─────────────────
const CURRENCIES = ['SGD', 'USD', 'JPY', 'EUR', 'GBP', 'THB', 'MYR', 'AUD', 'HKD', 'KRW'];

// ── ID generator ──────────────────────────────────────────────
function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Props ─────────────────────────────────────────────────────
interface ExpenseTrackerProps {
  trip: Trip;
  onTripUpdate: (updated: Trip) => void;
}

// ─────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────
export default function ExpenseTracker({ trip, onTripUpdate }: ExpenseTrackerProps) {
  // ── Expenses state ────────────────────────────────────────
  const [expenses, setExpenses] = useState<Expense[]>(
    () => trip.trip_metadata?.expenses ?? []
  );

  // ── Add form state ────────────────────────────────────────
  const [formOpen, setFormOpen]           = useState(false);
  const [amount, setAmount]               = useState('');
  const [currency, setCurrency]           = useState('SGD');
  const [category, setCategory]           = useState<ExpenseCategory>('food');
  const [description, setDescription]     = useState('');
  const [date, setDate]                   = useState(() => new Date().toISOString().split('T')[0]);

  // ── Save state ────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Derived: totals (Week 6 Day 1 fix) ───────────────────
  //
  // Each expense amount is converted to its USD equivalent before
  // summing. This means 5000 JPY (~$33.56) + 50 SGD (~$37.04) = ~$70.60
  // instead of the incorrect raw sum of 5050.
  //
  // trip.budget is treated as USD (the $ sign in the UI implies this).
  // Individual expense rows still display their original amount + currency.
  const totalSpentUSD = expenses.reduce(
    (sum, e) => sum + convertToUSD(e.amount, e.currency),
    0
  );

  const budget     = trip.budget ?? 0;
  // Guard: never divide by zero even if budget is 0
  const spentPct   = budget > 0 ? Math.min(100, Math.round((totalSpentUSD / budget) * 100)) : 0;
  const overBudget = budget > 0 && totalSpentUSD > budget;

  // ── Derived: category breakdown (also USD-normalised) ─────
  //
  // Each category's total is the sum of its expenses converted to USD,
  // so the breakdown is consistent with the main totalSpent figure.
  const categoryTotals = CATEGORIES.map((cat) => ({
    ...cat,
    totalUSD: expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0),
  })).filter((c) => c.totalUSD > 0);

  // ── Persist helper ─────────────────────────────────────────
  const persist = async (updated: Expense[]) => {
    setSaveStatus('saving');
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    try {
      const updatedTrip = await apiService.updateTrip(trip.id, { expenses: updated });
      setSaveStatus('saved');
      onTripUpdate(updatedTrip);
      clearTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save expenses:', err);
      setSaveStatus('error');
    }
  };

  // ── Add expense ───────────────────────────────────────────
  const handleAdd = async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0 || !description.trim()) return;

    const newExpense: Expense = {
      id:          generateId(),
      amount:      numericAmount,
      currency,
      category,
      description: description.trim(),
      date,
      created_at:  new Date().toISOString(),
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await persist(updated);

    // Reset form
    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormOpen(false);
  };

  // ── Delete expense ────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const previous = expenses;
    const updated  = expenses.filter((e) => e.id !== id);
    setExpenses(updated); // optimistic
    try {
      await persist(updated);
    } catch {
      setExpenses(previous); // rollback on failure
    }
  };

  // ── Input shared className ────────────────────────────────
  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 ' +
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white';

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span>💸</span> Expense Tracker
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {expenses.length === 0
              ? 'No expenses logged yet'
              : `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} logged`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && <span className="text-xs text-gray-400 animate-pulse">Saving…</span>}
          {saveStatus === 'saved'  && <span className="text-xs text-green-600 font-medium">✓ Saved</span>}
          {saveStatus === 'error'  && <span className="text-xs text-red-500">Failed to save</span>}
          <button
            onClick={() => setFormOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <span className="text-base leading-none">{formOpen ? '✕' : '+'}</span>
            {formOpen ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      {/* ── Budget summary bar ───────────────────────────────── */}
      {budget > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5 text-sm">
            <span className="text-gray-600 font-medium">
              Spent:{' '}
              <span className={overBudget ? 'text-red-600' : 'text-gray-900'}>
                ${totalSpentUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {expenses.some((e) => e.currency !== 'USD') && (
                <span className="text-xs text-gray-400 ml-1">(USD equiv.)</span>
              )}
            </span>
            <span className="text-gray-500">
              Budget: ${budget.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className={`h-2.5 rounded-full transition-colors ${
                overBudget ? 'bg-red-500' : spentPct >= 80 ? 'bg-amber-400' : 'bg-blue-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs font-medium ${overBudget ? 'text-red-500' : 'text-gray-400'}`}>
              {overBudget
                ? `⚠️ Over budget by $${(totalSpentUSD - budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${spentPct}% used`}
            </span>
            {!overBudget && budget > 0 && (
              <span className="text-xs text-gray-400">
                ${(budget - totalSpentUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* No budget set — show USD-equivalent total only */}
      {budget === 0 && expenses.length > 0 && (
        <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Total spent
            {expenses.some((e) => e.currency !== 'USD') && (
              <span className="text-xs text-gray-400 ml-1">(USD equiv.)</span>
            )}
          </span>
          <span className="text-base font-bold text-gray-900">
            ${totalSpentUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* ── Add expense form ─────────────────────────────────── */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
                New Expense
              </p>

              {/* Amount + Currency row */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Amount *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className={inputClass}
                    autoFocus
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className={inputClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Ramen lunch, Train ticket"
                  className={inputClass}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
              </div>

              {/* Category + Date row */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleAdd}
                disabled={!amount || parseFloat(amount) <= 0 || !description.trim()}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                Add Expense
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category breakdown (USD-normalised totals) ────────── */}
      {categoryTotals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            By Category
          </p>
          <div className="flex flex-wrap gap-2">
            {categoryTotals.map((cat) => (
              <div
                key={cat.value}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${cat.color}`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span className={`text-xs font-semibold ${cat.textColor}`}>
                  {cat.label}
                </span>
                <span className={`text-xs font-bold ${cat.textColor}`}>
                  ${cat.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expense list ─────────────────────────────────────── */}
      {expenses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Recent Expenses
          </p>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {expenses.map((expense) => {
                const cat = getCategoryConfig(expense.category);
                return (
                  <motion.li
                    key={expense.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-lg group transition-colors">
                      <span className="text-xl flex-shrink-0">{cat.icon}</span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {expense.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${cat.color} ${cat.textColor}`}>
                            {cat.label}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(expense.date).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Show original amount + currency — not converted */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-900">
                          {expense.currency}{' '}
                          {expense.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-lg leading-none ml-1"
                        title="Delete expense"
                      >
                        ✕
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────── */}
      {expenses.length === 0 && !formOpen && (
        <div className="text-center py-6">
          <p className="text-3xl mb-2">🧾</p>
          <p className="text-sm font-medium text-gray-500">No expenses logged yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Tap <strong>+ Add</strong> to record your first expense
          </p>
        </div>
      )}
    </div>
  );
}