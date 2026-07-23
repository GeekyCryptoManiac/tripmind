/**
 * AddExpenseModal — activity-scoped expense creation.
 *
 * Same controlled isOpen/onClose/onSubmit shape as AddActivityModal, but
 * for expenses opened from ActivityDetailPage's "Add expense" button.
 *
 * activity_id is a required prop, LOCKED to the current activity — there
 * is no field to edit or clear it here. An expense that shouldn't be tied
 * to a specific activity is created via ExpenseTracker's own form instead,
 * which has no activity_id at all.
 *
 * Fields (amount, currency, category, description, date) mirror
 * ExpenseTracker's inline form and use the same shared CURRENCIES/CATEGORIES
 * constants (utils/expenseConstants.ts) so the two forms can't drift apart
 * on available options.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CURRENCIES, CATEGORIES } from '../utils/expenseConstants';
import type { ExpenseCategory, ExpenseCreateRequest } from '../types';

interface AddExpenseModalProps {
  isOpen: boolean;
  activityId: number;
  activityTitle?: string;
  defaultCurrency?: string;
  onClose: () => void;
  onSubmit: (expense: ExpenseCreateRequest) => Promise<void>;
}

// ── SVG Icons ─────────────────────────────────────────────────
const XIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

// ── Reusable field wrapper ────────────────────────────────────
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-inkText mb-1.5">
        {label}
        {required && <span className="text-marigold ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-terrain/20 border border-card-border rounded-xl text-sm text-inkText placeholder-sage focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-colors';

const todayISO = () => new Date().toISOString().split('T')[0];

// ── Modal ─────────────────────────────────────────────────────
export default function AddExpenseModal({
  isOpen,
  activityId,
  activityTitle,
  defaultCurrency = 'SGD',
  onClose,
  onSubmit,
}: AddExpenseModalProps) {
  const [amount, setAmount]           = useState('');
  const [currency, setCurrency]       = useState(defaultCurrency);
  const [category, setCategory]       = useState<ExpenseCategory>('food');
  const [description, setDescription] = useState('');
  const [date, setDate]               = useState(todayISO);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Re-sync on every open, same reasoning as AddActivityModal: a
  // persistent instance won't otherwise pick up a fresh defaultCurrency
  // or clear stale values left over from a previous open.
  useEffect(() => {
    if (!isOpen) return;
    setAmount('');
    setCurrency(defaultCurrency);
    setCategory('food');
    setDescription('');
    setDate(todayISO());
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const resetForm = () => {
    setAmount('');
    setCurrency(defaultCurrency);
    setCategory('food');
    setDescription('');
    setDate(todayISO());
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError('Enter an amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      setError('Description is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        activity_id: activityId,
        amount: numericAmount,
        currency,
        category,
        description: description.trim(),
        date,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error('[AddExpenseModal] Submit error:', err);
      setError('Failed to add expense. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={handleClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-inkText/40 backdrop-blur-sm" />

          {/* Modal panel */}
          <motion.div
            className="relative z-10 bg-cream rounded-3xl shadow-modal w-full max-w-lg overflow-hidden"
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.34, 1.4, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-card-border">
              <div>
                <h2 className="font-display text-xl text-ink">Add Expense</h2>
                {activityTitle && (
                  <p className="text-sm text-sage mt-0.5 truncate">{activityTitle}</p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-terrain/30 text-sage hover:bg-terrain transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Amount + currency */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <Field label="Amount" required>
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
                  </Field>
                </div>
                <div className="w-28">
                  <Field label="Currency">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className={inputClass}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              {/* Description */}
              <Field label="Description" required>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Ramen lunch, Entrance ticket"
                  className={inputClass}
                />
              </Field>

              {/* Category */}
              <Field label="Category" required>
                <div className="flex gap-2 flex-wrap">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                        category === c.value
                          ? 'bg-ink text-cream border-ink shadow-sm'
                          : 'bg-terrain/20 text-sage border-card-border hover:border-ink hover:text-ink'
                      }`}
                    >
                      <c.Icon className="w-4 h-4" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>

              {/* Date */}
              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </Field>

              {/* Error */}
              {error && (
                <p className="text-sm text-poppy bg-poppy-tint border border-poppy/30 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-card-border">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-sage hover:text-ink hover:bg-terrain/20 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !amount || parseFloat(amount) <= 0 || !description.trim()}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-ink text-cream text-sm font-semibold rounded-xl hover:bg-ink/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    Add Expense
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
