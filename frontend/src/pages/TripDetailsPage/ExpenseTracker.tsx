/**
 * ExpenseTracker — Redesigned Week 7
 *
 * Visual updates:
 *   - All emojis replaced with SVG icons
 *   - Brand blue for form/CTA instead of bright blue
 *   - Amber for warnings instead of bright red
 *   - Emerald for success instead of bright green
 *   - White card with ring-1 ring-black/[0.03] border
 *   - Inner cells use surface-bg
 *   - Category badges with warm colors
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import { convertToUSD } from '../../utils/currency';
import type { Trip, Expense, ExpenseCategory } from '../../types';

// ── SVG Icons ─────────────────────────────────────────────────
const ReceiptIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// ── Category config (warm colors) ─────────────────────────────
const CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
}[] = [
  {
    value: 'food',
    label: 'Food & Drink',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    badgeBg: 'bg-orange-100',
    badgeText: 'text-orange-700',
  },
  {
    value: 'transport',
    label: 'Transport',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
  },
  {
    value: 'activities',
    label: 'Activities',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
  },
  {
    value: 'shopping',
    label: 'Shopping',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    badgeBg: 'bg-pink-100',
    badgeText: 'text-pink-700',
  },
  {
    value: 'accommodation',
    label: 'Accommodation',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    badgeBg: 'bg-green-100',
    badgeText: 'text-green-700',
  },
  {
    value: 'other',
    label: 'Other',
    Icon: ({ className = "w-4 h-4" }) => (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
    badgeBg: 'bg-gray-100',
    badgeText: 'text-gray-600',
  },
];

function getCategoryConfig(value: ExpenseCategory) {
  return CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];
}

const CURRENCIES = ['SGD', 'USD', 'JPY', 'EUR', 'GBP', 'THB', 'MYR', 'AUD', 'HKD', 'KRW'];

function generateId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

interface ExpenseTrackerProps {
  trip: Trip;
  onTripUpdate: (updated: Trip) => void;
}

export default function ExpenseTracker({ trip, onTripUpdate }: ExpenseTrackerProps) {
  const [expenses, setExpenses] = useState<Expense[]>(() => trip.trip_metadata?.expenses ?? []);
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('SGD');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalSpentUSD = expenses.reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0);
  const budget = trip.budget ?? 0;
  const spentPct = budget > 0 ? Math.min(100, Math.round((totalSpentUSD / budget) * 100)) : 0;
  const overBudget = budget > 0 && totalSpentUSD > budget;

  const categoryTotals = CATEGORIES.map((cat) => ({
    ...cat,
    totalUSD: expenses
      .filter((e) => e.category === cat.value)
      .reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0),
  })).filter((c) => c.totalUSD > 0);

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

  const handleAdd = async () => {
    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0 || !description.trim()) return;

    const newExpense: Expense = {
      id: generateId(),
      amount: numericAmount,
      currency,
      category,
      description: description.trim(),
      date,
      created_at: new Date().toISOString(),
    };

    const updated = [newExpense, ...expenses];
    setExpenses(updated);
    await persist(updated);

    setAmount('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    const previous = expenses;
    const updated = expenses.filter((e) => e.id !== id);
    setExpenses(updated);
    try {
      await persist(updated);
    } catch {
      setExpenses(previous);
    }
  };

  const inputClass =
    'w-full border border-surface-muted rounded-xl px-3 py-2.5 text-sm bg-surface-bg text-ink ' +
    'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white';

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-ink-tertiary">
            <ReceiptIcon />
          </div>
          <div>
            <h3 className="text-base font-semibold text-ink">Expense Tracker</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">
              {expenses.length === 0
                ? 'No expenses logged yet'
                : `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} logged`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && <span className="text-xs text-ink-tertiary animate-pulse">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>}
          {saveStatus === 'error' && <span className="text-xs text-amber-600">Failed to save</span>}
          <button
            onClick={() => setFormOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {formOpen ? <XIcon /> : <PlusIcon />}
            {formOpen ? 'Cancel' : 'Add'}
          </button>
        </div>
      </div>

      {/* Budget bar */}
      {budget > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5 text-sm">
            <span className="text-ink-secondary font-medium">
              Spent:{' '}
              <span className={overBudget ? 'text-amber-600' : 'text-ink'}>
                ${totalSpentUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {expenses.some((e) => e.currency !== 'USD') && (
                <span className="text-xs text-ink-tertiary ml-1">(USD equiv.)</span>
              )}
            </span>
            <span className="text-ink-tertiary">Budget: ${budget.toLocaleString()}</span>
          </div>
          <div className="w-full bg-surface-muted rounded-full h-2.5 overflow-hidden">
            <motion.div
              className={`h-2.5 rounded-full transition-colors ${
                overBudget ? 'bg-amber-500' : spentPct >= 80 ? 'bg-amber-400' : 'bg-brand-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${spentPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className={`text-xs font-medium ${overBudget ? 'text-amber-600' : 'text-ink-tertiary'}`}>
              {overBudget
                ? `⚠ Over budget by $${(totalSpentUSD - budget).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `${spentPct}% used`}
            </span>
            {!overBudget && budget > 0 && (
              <span className="text-xs text-ink-tertiary">
                ${(budget - totalSpentUSD).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} remaining
              </span>
            )}
          </div>
        </div>
      )}

      {/* No budget - show total */}
      {budget === 0 && expenses.length > 0 && (
        <div className="bg-surface-bg rounded-xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-ink-secondary">
            Total spent
            {expenses.some((e) => e.currency !== 'USD') && (
              <span className="text-xs text-ink-tertiary ml-1">(USD equiv.)</span>
            )}
          </span>
          <span className="text-base font-bold text-ink">
            ${totalSpentUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Add form */}
      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border border-brand-200 bg-brand-50 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">New Expense</p>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-ink-tertiary mb-1 block">Amount *</label>
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
                  <label className="text-xs font-medium text-ink-tertiary mb-1 block">Currency</label>
                  <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-ink-tertiary mb-1 block">Description *</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Ramen lunch, Train ticket"
                  className={inputClass}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                />
              </div>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs font-medium text-ink-tertiary mb-1 block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className={inputClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-ink-tertiary mb-1 block">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
                </div>
              </div>

              <button
                onClick={handleAdd}
                disabled={!amount || parseFloat(amount) <= 0 || !description.trim()}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Add Expense
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category breakdown */}
      {categoryTotals.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">By Category</p>
          <div className="flex flex-wrap gap-2">
            {categoryTotals.map((cat) => (
              <div key={cat.value} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${cat.badgeBg}`}>
                <div className={cat.badgeText}>
                  <cat.Icon className="w-3.5 h-3.5" />
                </div>
                <span className={`text-xs font-semibold ${cat.badgeText}`}>{cat.label}</span>
                <span className={`text-xs font-bold ${cat.badgeText}`}>
                  ${cat.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense list */}
      {expenses.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">Recent Expenses</p>
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {expenses.map((expense) => {
                const cat = getCategoryConfig(expense.category);
                const Icon = cat.Icon;
                return (
                  <motion.li
                    key={expense.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5 bg-surface-bg hover:bg-surface-muted rounded-xl group transition-colors">
                      <div className="text-ink-tertiary flex-shrink-0">
                        <Icon />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink truncate">{expense.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${cat.badgeBg} ${cat.badgeText}`}>
                            {cat.label}
                          </span>
                          <span className="text-[11px] text-ink-tertiary">
                            {new Date(expense.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-ink">
                          {expense.currency}{' '}
                          {expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <button
                        onClick={() => handleDelete(expense.id)}
                        className="flex-shrink-0 text-ink-tertiary hover:text-amber-600 transition-colors opacity-0 group-hover:opacity-100 ml-1"
                        title="Delete expense"
                      >
                        <XIcon />
                      </button>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        </div>
      )}

      {/* Empty state */}
      {expenses.length === 0 && !formOpen && (
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-surface-bg flex items-center justify-center mx-auto mb-3">
            <div className="text-ink-tertiary">
              <ReceiptIcon className="w-8 h-8" />
            </div>
          </div>
          <p className="text-sm font-medium text-ink-secondary">No expenses logged yet</p>
          <p className="text-xs text-ink-tertiary mt-1">
            Tap <strong>+ Add</strong> to record your first expense
          </p>
        </div>
      )}
    </div>
  );
}