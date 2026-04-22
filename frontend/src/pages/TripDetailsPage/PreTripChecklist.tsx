/**
 * PreTripChecklist — Round 1 Migration
 *
 * Changes:
 *   - Removed trip_metadata?.checklist — now reads from trip.checklist_items
 *   - Removed local items state — trip.checklist_items is source of truth
 *   - DEFAULT_ITEMS is now text-only; seeding calls addChecklistItem per item
 *   - handleToggle(id: number) → updateChecklistItem → getTrip → onTripUpdate
 *   - ChecklistItem field names: item.text (was label), item.is_checked (was checked)
 *   - Removed checked_at display (field removed from schema)
 *   - Removed useEffect re-sync from trip_metadata
 *   - Updated design tokens (gray-* → ink-*, green-* → emerald-*)
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../../services/api';
import type { Trip } from '../../types';

// ── Default item labels for first-time seeding ────────────────
// Text only — IDs are assigned by the backend after addChecklistItem calls.
const DEFAULT_ITEM_TEXTS = [
  'Passport / visa ready',
  'Flights confirmed',
  'Hotels booked',
  'Travel insurance arranged',
  'Local currency obtained',
  'Offline maps downloaded',
  'Emergency contacts saved',
  'Notify bank of travel',
];

// ── Props ─────────────────────────────────────────────────────
interface PreTripChecklistProps {
  trip: Trip;
  onTripUpdate: (updated: Trip) => void;
}

// ── Component ─────────────────────────────────────────────────
export default function PreTripChecklist({ trip, onTripUpdate }: PreTripChecklistProps) {
  // trip.checklist_items is the source of truth — no local list state
  const items = trip.checklist_items;

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [seeding, setSeeding] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    };
  }, []);

  const setSaved = () => {
    setSaveStatus('saved');
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    clearTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // ── Seed defaults when checklist is empty ─────────────────
  const handleSeedDefaults = async () => {
    setSeeding(true);
    setSaveStatus('saving');
    try {
      for (let i = 0; i < DEFAULT_ITEM_TEXTS.length; i++) {
        await apiService.addChecklistItem(trip.id, {
          text: DEFAULT_ITEM_TEXTS[i],
          sort_order: i,
        });
      }
      const updatedTrip = await apiService.getTrip(trip.id);
      onTripUpdate(updatedTrip);
      setSaved();
    } catch (err) {
      console.error('Failed to seed checklist:', err);
      setSaveStatus('error');
    } finally {
      setSeeding(false);
    }
  };

  // ── Toggle checked state ──────────────────────────────────
  const handleToggle = async (id: number, currentChecked: boolean) => {
    setSaveStatus('saving');
    if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
    try {
      await apiService.updateChecklistItem(trip.id, id, { is_checked: !currentChecked });
      const updatedTrip = await apiService.getTrip(trip.id);
      onTripUpdate(updatedTrip);
      setSaved();
    } catch (err) {
      console.error('Failed to update checklist item:', err);
      setSaveStatus('error');
    }
  };

  // ── Derived values ────────────────────────────────────────
  const checkedCount = items.filter((i) => i.is_checked).length;
  const total = items.length;
  const allDone = total > 0 && checkedCount === total;
  const progressPct = total > 0 ? Math.round((checkedCount / total) * 100) : 0;

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6"
    >
      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-ink">Pre-Trip Checklist</h3>
          <p className="text-sm text-ink-secondary mt-0.5">
            Get everything ready before you fly out
          </p>
        </div>

        {/* Save status indicator */}
        <div className="flex-shrink-0 text-right">
          {saveStatus === 'saving' && (
            <span className="text-xs text-ink-tertiary animate-pulse">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-amber-600">Failed to save</span>
          )}
        </div>
      </div>

      {/* ── Empty state — offer to seed defaults ─────────────── */}
      {items.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-ink-secondary mb-3">No checklist items yet.</p>
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {seeding ? 'Loading defaults…' : 'Load default checklist'}
          </button>
        </div>
      )}

      {/* ── Progress bar + count (only when items exist) ──────── */}
      {items.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-ink-secondary">
              {allDone ? '🎉 All ready to go!' : `${checkedCount} of ${total} items ready`}
            </span>
            <span className={`text-xs font-bold ${allDone ? 'text-emerald-600' : 'text-amber-600'}`}>
              {progressPct}%
            </span>
          </div>

          <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-2 rounded-full transition-colors ${
                allDone ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* ── Checklist items ──────────────────────────────────── */}
      {items.length > 0 && (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {items
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((item) => (
                <motion.li
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <button
                    onClick={() => handleToggle(item.id, item.is_checked)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl
                      text-left transition-all duration-200 group border
                      ${item.is_checked
                        ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-surface-bg border-surface-muted hover:bg-amber-50 hover:border-amber-200'
                      }
                    `}
                  >
                    {/* Custom checkbox visual */}
                    <span
                      className={`
                        flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        transition-all duration-200
                        ${item.is_checked
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-surface-muted group-hover:border-amber-400'
                        }
                      `}
                    >
                      {item.is_checked && (
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
                        item.is_checked
                          ? 'line-through text-ink-tertiary'
                          : 'text-ink font-medium'
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>
                </motion.li>
              ))}
          </AnimatePresence>
        </ul>
      )}

      {/* ── All done celebration banner ───────────────────────── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center"
          >
            <p className="text-emerald-700 text-sm font-semibold">
              🎉 You're all set! Have an amazing trip to {trip.destination}!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}