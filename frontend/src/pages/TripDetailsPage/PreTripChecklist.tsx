/**
 * PreTripChecklist — Round 1 Migration + Custom Item Support
 *
 * Round 1 Migration:
 *   - Removed trip_metadata?.checklist — now reads from trip.checklist_items
 *   - Removed local items state — trip.checklist_items is source of truth
 *   - DEFAULT_ITEM_TEXTS is now text-only; seeding calls addChecklistItem per item
 *   - handleToggle(id: number) → updateChecklistItem → getTrip → onTripUpdate
 *   - ChecklistItem field names: item.text (was label), item.is_checked (was checked)
 *   - Removed checked_at display (field removed from schema)
 *   - Removed useEffect re-sync from trip_metadata
 *   - Updated design tokens (gray-* → ink-*, green-* → emerald-*)
 *
 * Custom Item Support:
 *   - Added a text input + "Add" affordance — apiService.addChecklistItem →
 *     getTrip → onTripUpdate, same request/refresh pattern as toggle/seed.
 *   - Added a per-item hover-revealed delete button, matching
 *     ItineraryTab/ActivityCard.tsx's delete button exactly (icon, sizing,
 *     poppy hover-color convention) — apiService.deleteChecklistItem →
 *     getTrip → onTripUpdate.
 *   - Add/delete work on any item regardless of origin (seeded or custom).
 *   - checkedCount/total (and the progress bar/percentage) already derive
 *     from items.length/items.filter(...) — no changes needed there, they
 *     recalculate correctly as items are added or removed.
 *   - Deliberately out of scope: no phase-specific checklist behavior, no
 *     split between a pre-trip and during-trip list — this remains one
 *     single, phase-agnostic checklist, per the explicit scope boundary.
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

// ── SVG Icons ─────────────────────────────────────────────────
const PlusIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

// Matches ItineraryTab/ActivityCard.tsx's TrashIcon exactly.
const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

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
  const [newItemText, setNewItemText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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

  // ── Add a custom item ──────────────────────────────────────
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text || isAdding) return;

    setIsAdding(true);
    setSaveStatus('saving');
    try {
      await apiService.addChecklistItem(trip.id, {
        text,
        sort_order: items.length,
      });
      const updatedTrip = await apiService.getTrip(trip.id);
      onTripUpdate(updatedTrip);
      setNewItemText('');
      setSaved();
    } catch (err) {
      console.error('Failed to add checklist item:', err);
      setSaveStatus('error');
    } finally {
      setIsAdding(false);
    }
  };

  // ── Delete an item (seeded or custom) ─────────────────────
  const handleDeleteItem = async (id: number) => {
    if (deletingId !== null) return;
    setDeletingId(id);
    setSaveStatus('saving');
    try {
      await apiService.deleteChecklistItem(trip.id, id);
      const updatedTrip = await apiService.getTrip(trip.id);
      onTripUpdate(updatedTrip);
      setSaved();
    } catch (err) {
      console.error('Failed to delete checklist item:', err);
      setSaveStatus('error');
    } finally {
      setDeletingId(null);
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
          <h3 className="text-base font-semibold text-inkText">Pre-Trip Checklist</h3>
          <p className="text-sm text-inkText-secondary mt-0.5">
            Get everything ready before you fly out
          </p>
        </div>

        {/* Save status indicator */}
        <div className="flex-shrink-0 text-right">
          {saveStatus === 'saving' && (
            <span className="text-xs text-inkText-tertiary animate-pulse">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-sage font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-poppy">Failed to save</span>
          )}
        </div>
      </div>

      {/* ── Empty state — offer to seed defaults ─────────────── */}
      {items.length === 0 && (
        <div className="text-center py-6">
          <p className="text-sm text-inkText-secondary mb-3">No checklist items yet.</p>
          <button
            onClick={handleSeedDefaults}
            disabled={seeding}
            className="px-4 py-2 bg-ink hover:bg-ink/80 disabled:bg-ink/40 text-white text-sm font-medium rounded-xl transition-colors"
          >
            {seeding ? 'Loading defaults…' : 'Load default checklist'}
          </button>
        </div>
      )}

      {/* ── Progress bar + count (only when items exist) ──────── */}
      {items.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-inkText-secondary">
              {allDone ? '🎉 All ready to go!' : `${checkedCount} of ${total} items ready`}
            </span>
            <span className={`text-xs font-bold ${allDone ? 'text-sage' : 'text-marigold'}`}>
              {progressPct}%
            </span>
          </div>

          <div className="w-full bg-surface-muted rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-2 rounded-full transition-colors ${
                allDone ? 'bg-sage' : 'bg-marigold'
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
                  exit={{ opacity: 0, x: 10, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="group/item flex items-center gap-2"
                >
                  <button
                    onClick={() => handleToggle(item.id, item.is_checked)}
                    className={`
                      flex-1 min-w-0 flex items-center gap-3 px-4 py-3 rounded-xl
                      text-left transition-all duration-200 group border
                      ${item.is_checked
                        ? 'bg-sage-tint border-sage/30 hover:bg-sage-tint/70'
                        : 'bg-surface-bg border-surface-muted hover:bg-marigold/10 hover:border-marigold/40'
                      }
                    `}
                  >
                    {/* Custom checkbox visual */}
                    <span
                      className={`
                        flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center
                        transition-all duration-200
                        ${item.is_checked
                          ? 'bg-sage border-sage text-white'
                          : 'border-surface-muted group-hover:border-marigold'
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
                      className={`text-sm truncate transition-all duration-200 ${
                        item.is_checked
                          ? 'line-through text-inkText-tertiary'
                          : 'text-inkText font-medium'
                      }`}
                    >
                      {item.text}
                    </span>
                  </button>

                  {/* Delete — hover-revealed, matches ActivityCard.tsx's delete button */}
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deletingId === item.id}
                    title="Delete item"
                    className="flex-shrink-0 opacity-0 group-hover/item:opacity-100 p-1.5 text-sage hover:text-poppy hover:bg-poppy-tint rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {deletingId === item.id ? (
                      <div className="w-4 h-4 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
                    ) : (
                      <TrashIcon />
                    )}
                  </button>
                </motion.li>
              ))}
          </AnimatePresence>
        </ul>
      )}

      {/* ── Add a custom item ─────────────────────────────────── */}
      <form onSubmit={handleAddItem} className={`flex gap-2 ${items.length > 0 ? 'mt-3' : ''}`}>
        <input
          type="text"
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          placeholder="Add an item…"
          className="flex-1 min-w-0 bg-surface-bg border border-surface-muted rounded-xl px-3 py-2 text-sm text-inkText placeholder-inkText-tertiary focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition-colors"
        />
        <button
          type="submit"
          disabled={isAdding || !newItemText.trim()}
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-ink hover:bg-ink/80 disabled:bg-ink/40 text-white text-sm font-medium rounded-xl transition-colors disabled:cursor-not-allowed"
        >
          <PlusIcon />
          Add
        </button>
      </form>

      {/* ── All done celebration banner ───────────────────────── */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-4 bg-sage-tint border border-sage/30 rounded-xl p-3 text-center"
          >
            <p className="text-sage text-sm font-semibold">
              🎉 You're all set! Have an amazing trip to {trip.destination}!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
