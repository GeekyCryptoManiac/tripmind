/**
 * PreTripChecklist
 *
 * Shown inside OverviewTab when phase === 'pre-trip'.
 * Tracks 8 standard pre-travel tasks and persists checked
 * state to trip_metadata.checklist via updateTrip().
 *
 * State strategy:
 *   - On mount: use trip.trip_metadata.checklist if it exists
 *     (returning user), otherwise seed with DEFAULT_ITEMS (first visit).
 *   - On check/uncheck: optimistic local update first (instant UI
 *     feedback), then save to backend in the background.
 *   - onTripUpdate keeps the parent trip state in sync so the
 *     progress bar can react if checklist data affects it later.
 *
 * Saving state feedback:
 *   idle    → nothing shown
 *   saving  → "Saving..." (pulse)
 *   saved   → "✓ Saved" (green, auto-clears after 2s)
 *   error   → "Failed to save" (red)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import type { Trip, ChecklistItem } from '../../types';

// ── Default checklist items ───────────────────────────────────
// Used when a trip has no saved checklist yet.
// IDs are stable strings so the backend can merge on future requests.
const DEFAULT_ITEMS: ChecklistItem[] = [
  { id: 'passport',   label: 'Passport / visa ready',       checked: false },
  { id: 'flights',    label: 'Flights confirmed',            checked: false },
  { id: 'hotels',     label: 'Hotels booked',               checked: false },
  { id: 'insurance',  label: 'Travel insurance arranged',   checked: false },
  { id: 'currency',   label: 'Local currency obtained',     checked: false },
  { id: 'maps',       label: 'Offline maps downloaded',     checked: false },
  { id: 'contacts',   label: 'Emergency contacts saved',    checked: false },
  { id: 'bank',       label: 'Notify bank of travel',       checked: false },
];

// ── Props ─────────────────────────────────────────────────────
interface PreTripChecklistProps {
  trip: Trip;
  onTripUpdate: (updated: Trip) => void;
}

// ── Component ─────────────────────────────────────────────────
export default function PreTripChecklist({ trip, onTripUpdate }: PreTripChecklistProps) {
  // ── Initialise from saved data or defaults ────────────────
  const [items, setItems] = useState<ChecklistItem[]>(() => {
    const saved = trip.trip_metadata?.checklist;
    // Use saved checklist if it exists and has at least one item
    if (saved && saved.length > 0) return saved;
    return DEFAULT_ITEMS;
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Ref to track the auto-clear timer for 'saved' status
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // If the parent trip object changes (e.g. after a modal save),
  // re-sync checklist from the fresh trip_metadata.
  const prevTripId = useRef(trip.id);
  useEffect(() => {
    if (trip.id !== prevTripId.current) {
      prevTripId.current = trip.id;
      const saved = trip.trip_metadata?.checklist;
      setItems(saved && saved.length > 0 ? saved : DEFAULT_ITEMS);
    }
  }, [trip.id, trip.trip_metadata?.checklist]);

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  // ── Toggle handler ────────────────────────────────────────
  const handleToggle = async (id: string) => {
    // 1. Optimistic local update — instant UI feedback
    const updatedItems = items.map((item) =>
      item.id === id
        ? {
            ...item,
            checked: !item.checked,
            checked_at: !item.checked ? new Date().toISOString() : undefined,
          }
        : item
    );
    setItems(updatedItems);

    // 2. Persist to backend
    setSaveStatus('saving');
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);

    try {
      const updated = await apiService.updateTrip(trip.id, { checklist: updatedItems });
      setSaveStatus('saved');
      onTripUpdate(updated);

      // Auto-clear 'saved' status after 2s
      clearTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save checklist:', err);
      setSaveStatus('error');
      // On error, roll back the optimistic update
      setItems(items);
    }
  };

  // ── Derived values ────────────────────────────────────────
  const checkedCount = items.filter((i) => i.checked).length;
  const total = items.length;
  const allDone = checkedCount === total;
  const progressPct = Math.round((checkedCount / total) * 100);

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-xl border border-amber-200 shadow-sm p-6"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <span>✅</span> Pre-Trip Checklist
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Get everything ready before you fly out
          </p>
        </div>

        {/* Save status indicator */}
        <div className="flex-shrink-0 text-right">
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Failed to save</span>
          )}
        </div>
      </div>

      {/* ── Progress bar + count ─────────────────────────────── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-500">
            {allDone ? '🎉 All ready to go!' : `${checkedCount} of ${total} items ready`}
          </span>
          <span
            className={`text-xs font-bold ${
              allDone ? 'text-green-600' : 'text-amber-600'
            }`}
          >
            {progressPct}%
          </span>
        </div>

        {/* Track */}
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <motion.div
            className={`h-2 rounded-full transition-colors ${
              allDone ? 'bg-green-500' : 'bg-amber-400'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* ── Checklist items ──────────────────────────────────── */}
      <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.li
              key={item.id}
              layout
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                onClick={() => handleToggle(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  text-left transition-all duration-200 group
                  ${
                    item.checked
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-gray-50 hover:bg-amber-50 hover:border-amber-200'
                  }
                  border
                  ${item.checked ? 'border-green-200' : 'border-gray-200'}
                `}
              >
                {/* Custom checkbox visual */}
                <span
                  className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                    transition-all duration-200
                    ${
                      item.checked
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 group-hover:border-amber-400'
                    }
                  `}
                >
                  {item.checked && (
                    <motion.svg
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.15, type: 'spring', stiffness: 400 }}
                      className="w-3 h-3"
                      viewBox="0 0 12 12"
                      fill="none"
                    >
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="white"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </motion.svg>
                  )}
                </span>

                {/* Label */}
                <span
                  className={`text-sm transition-all duration-200 ${
                    item.checked
                      ? 'line-through text-gray-400'
                      : 'text-gray-700 font-medium'
                  }`}
                >
                  {item.label}
                </span>

                {/* Checked timestamp (right side, subtle) */}
                {item.checked && item.checked_at && (
                  <span className="ml-auto text-xs text-gray-400 flex-shrink-0">
                    {new Date(item.checked_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                )}
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      {/* ── All done celebration banner ───────────────────────── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3 text-center"
          >
            <p className="text-green-700 text-sm font-semibold">
              🎉 You're all set! Have an amazing trip to {trip.destination}!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}