/**
 * AddActivityModal — Week 8
 *
 * Modal form for manually adding a single activity to a trip day.
 * Used from both EmptyDayState and the per-day "Add activity" button
 * in ActivityTimeline.
 *
 * Fields:
 *   - Title (required)
 *   - Type (required) — drives the icon in ActivityCard
 *   - Time (required)
 *   - Location (optional)
 *   - Description (optional)
 *   - Notes (optional)
 *
 * Day is pre-filled from the selectedDay in ItineraryTab and is
 * shown as read-only context, not editable here.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity } from '../../../types';
import type { ActivityCreateRequest } from '../../../services/api';

interface AddActivityModalProps {
  isOpen: boolean;
  day: number;
  tripDestination: string;
  onClose: () => void;
  onSubmit: (activity: ActivityCreateRequest) => Promise<void>;
}

// ── Activity type options ─────────────────────────────────────
const ACTIVITY_TYPES: { value: Activity['type']; label: string; icon: string }[] = [
  { value: 'activity',  label: 'Sightseeing / Activity', icon: '🏛️' },
  { value: 'dining',    label: 'Dining',                 icon: '🍽️' },
  { value: 'transport', label: 'Transport',              icon: '🚌' },
  { value: 'hotel',     label: 'Accommodation',          icon: '🏨' },
  { value: 'flight',    label: 'Flight',                 icon: '✈️' },
];

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
      <label className="block text-sm font-medium text-ink mb-1.5">
        {label}
        {required && <span className="text-amber-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full px-4 py-2.5 bg-surface-bg border border-surface-muted rounded-xl text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors';

// ── Modal ─────────────────────────────────────────────────────
export default function AddActivityModal({
  isOpen,
  day,
  tripDestination,
  onClose,
  onSubmit,
}: AddActivityModalProps) {
  const [title, setTitle]             = useState('');
  const [type, setType]               = useState<Activity['type']>('activity');
  const [time, setTime]               = useState('09:00');
  const [location, setLocation]       = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes]             = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const resetForm = () => {
    setTitle('');
    setType('activity');
    setTime('09:00');
    setLocation('');
    setDescription('');
    setNotes('');
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!time) {
      setError('Time is required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        day,
        time,
        type,
        title: title.trim(),
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      resetForm();
      onClose();
    } catch (err) {
      console.error('[AddActivityModal] Submit error:', err);
      setError('Failed to add activity. Please try again.');
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
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

          {/* Modal panel */}
          <motion.div
            className="relative z-10 bg-white rounded-3xl shadow-modal w-full max-w-lg overflow-hidden"
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.34, 1.4, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-surface-muted">
              <div>
                <h2 className="font-display text-xl text-ink">Add Activity</h2>
                <p className="text-sm text-ink-secondary mt-0.5">
                  Day {day} · {tripDestination}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-surface-bg text-ink-secondary hover:bg-surface-muted transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-7 py-6 space-y-5 max-h-[70vh] overflow-y-auto">

              {/* Title */}
              <Field label="Title" required>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Osaka Castle, Dinner at Ichiran"
                  className={inputClass}
                  autoFocus
                />
              </Field>

              {/* Type + Time — side by side */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Type" required>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as Activity['type'])}
                    className={inputClass}
                  >
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Time" required>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </div>

              {/* Location */}
              <Field label="Location">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Osaka, Japan"
                  className={inputClass}
                />
              </Field>

              {/* Description */}
              <Field label="Description">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the activity..."
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {/* Notes */}
              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Tips, reminders, booking references..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </Field>

              {/* Error */}
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                  {error}
                </p>
              )}
            </form>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-7 py-5 border-t border-surface-muted">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-semibold text-ink-secondary hover:text-ink hover:bg-surface-bg rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form=""
                disabled={isSubmitting || !title.trim()}
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <PlusIcon />
                    Add Activity
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