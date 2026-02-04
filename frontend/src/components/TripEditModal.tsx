/**
 * TripEditModal
 *
 * Editable fields: destination, status, start/end dates, duration, budget, travelers.
 * Duration auto-calculates when both dates are set; stays manually editable otherwise.
 * Save hits PUT /api/trips/{id} (built Day 2) — zero new backend work.
 * Animations: framer-motion scale + fade (same pattern as TripSelectModal).
 *
 * Props:
 *   trip     – the current Trip object (pre-fills every field)
 *   isOpen   – controls visibility
 *   onClose  – called when user clicks ✕, Cancel, or the backdrop
 *   onSave   – called with the updated Trip returned by the API
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import type { Trip } from '../types';

// ── Helpers ───────────────────────────────────────────────────

/** Convert any date string → YYYY-MM-DD for <input type="date">.
 *  Handles ISO strings, plain YYYY-MM-DD, or garbage (returns ''). */
function toDateInput(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

/** Whole days between two YYYY-MM-DD strings. null if either is missing or result ≤ 0. */
function calcDays(start: string, end: string): number | null {
  if (!start || !end) return null;
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

// ── Status dropdown options ──────────────────────────────────
// Colours intentionally match getStatusStyles() in TripDetailsPage
const STATUS_OPTIONS = [
  { value: 'planning',  label: 'Planning',  dot: 'bg-amber-400',  highlight: 'bg-amber-50'  },
  { value: 'booked',    label: 'Booked',    dot: 'bg-blue-400',   highlight: 'bg-blue-50'   },
  { value: 'completed', label: 'Completed', dot: 'bg-green-400',  highlight: 'bg-green-50'  },
];

// ── Types ─────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface TripEditModalProps {
  trip:    Trip;
  isOpen:  boolean;
  onClose: () => void;
  onSave:  (updated: Trip) => void;
}

// ── Component ─────────────────────────────────────────────────
export default function TripEditModal({ trip, isOpen, onClose, onSave }: TripEditModalProps) {

  // ── Form state (pre-filled from trip) ────────────────────────
  const [destination, setDestination] = useState(trip.destination);
  const [status,      setStatus]      = useState(trip.status);
  const [startDate,   setStartDate]   = useState(toDateInput(trip.start_date));
  const [endDate,     setEndDate]     = useState(toDateInput(trip.end_date));
  const [duration,    setDuration]    = useState<string>(trip.duration_days?.toString() ?? '');
  const [budget,      setBudget]      = useState<string>(trip.budget?.toString() ?? '');
  const [travelers,   setTravelers]   = useState<string>(trip.travelers_count.toString());

  // ── UI state ──────────────────────────────────────────────────
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [dateError,  setDateError]  = useState('');
  const [statusOpen, setStatusOpen] = useState(false);

  // ── Duration auto-calc ────────────────────────────────────────
  // When BOTH dates are filled the field becomes read-only and auto-updates.
  // When only one (or neither) is filled the user can type duration manually.
  const durationIsAutoCalc = !!(startDate && endDate);

  useEffect(() => {
    if (startDate && endDate) {
      if (endDate <= startDate) {
        setDateError('End date must be after start date');
        setDuration('');
      } else {
        setDuration((calcDays(startDate, endDate) ?? '').toString());
        setDateError('');
      }
    } else {
      setDateError('');  // clear any stale error when a date is removed
    }
  }, [startDate, endDate]);

  // ── Save ──────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!destination.trim() || dateError || saveStatus === 'saving') return;

    setSaveStatus('saving');
    try {
      // Build payload — only include fields that actually have a value.
      // Empty strings are intentionally omitted so the backend leaves
      // those columns untouched.
      const payload: Record<string, any> = {
        destination: destination.trim(),
        status,
      };
      if (startDate)                                  payload.start_date      = startDate;
      if (endDate)                                    payload.end_date        = endDate;
      if (duration !== '')                            payload.duration_days   = parseInt(duration);
      if (budget !== '' && !isNaN(Number(budget)))    payload.budget          = parseFloat(budget);
      if (travelers !== '')                           payload.travelers_count = Math.max(1, parseInt(travelers) || 1);

      const updated = await apiService.updateTrip(trip.id, payload);

      setSaveStatus('saved');
      // Short "✓ Saved" flash, then hand the fresh trip up and close
      setTimeout(() => {
        onSave(updated);
        onClose();
      }, 600);
    } catch (err) {
      console.error('Failed to update trip:', err);
      setSaveStatus('error');
    }
  };

  // ── Shared input className helper ─────────────────────────────
  const inputClass = (disabled?: boolean) =>
    [
      'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800',
      'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
      disabled
        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
        : 'bg-gray-50 focus:bg-white',
    ].join(' ');

  // ── Render ────────────────────────────────────────────────────
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop ──────────────────────────────────────── */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-40 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* ── Modal shell ───────────────────────────────────── */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >

              {/* ── Header ──────────────────────────────────── */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Edit Trip</h2>
                  <p className="text-sm text-gray-400">{trip.destination}</p>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1 transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* ── Body ────────────────────────────────────── */}
              <div className="px-6 pb-6 space-y-5">

                {/* ─── Section 1: Trip Info ─────────────────── */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Trip Info</p>

                  {/* Destination */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <span>🌍</span> Destination
                    </label>
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className={inputClass()}
                    />
                  </div>

                  {/* Status — custom dropdown with coloured dots */}
                  <div className="relative">
                    <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                      <span>📍</span> Status
                    </label>

                    {/* Trigger */}
                    <button
                      type="button"
                      onClick={() => setStatusOpen(!statusOpen)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 hover:bg-white text-sm flex items-center justify-between transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${STATUS_OPTIONS.find(s => s.value === status)?.dot}`} />
                        <span className="text-gray-800 capitalize">{status}</span>
                      </span>
                      <span className="text-gray-400 text-xs">{statusOpen ? '▲' : '▼'}</span>
                    </button>

                    {/* Dropdown options */}
                    {statusOpen && (
                      <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-10">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => { setStatus(opt.value); setStatusOpen(false); }}
                            className={[
                              'w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 transition-colors',
                              status === opt.value ? opt.highlight : 'hover:bg-gray-50',
                            ].join(' ')}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                            <span className={status === opt.value ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                              {opt.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Divider ────────────────────────────────── */}
                <hr className="border-gray-100" />

                {/* ─── Section 2: Travel Dates ──────────────── */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Travel Dates</p>

                  {/* Start + End side by side */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-600 mb-1.5 block">Start Date</label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className={inputClass()}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-600 mb-1.5 block">End Date</label>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className={inputClass()}
                      />
                    </div>
                  </div>

                  {/* Date validation error */}
                  {dateError && (
                    <p className="text-xs text-red-500 -mt-2">{dateError}</p>
                  )}

                  {/* Duration — auto-calc when both dates set */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 flex items-center justify-between">
                      <span>⏱️ Duration (days)</span>
                      {durationIsAutoCalc && (
                        <span className="text-xs text-blue-500 font-normal">Auto-calculated</span>
                      )}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      disabled={durationIsAutoCalc}
                      placeholder="e.g. 5"
                      className={inputClass(durationIsAutoCalc)}
                    />
                  </div>
                </div>

                {/* ─── Divider ────────────────────────────────── */}
                <hr className="border-gray-100" />

                {/* ─── Section 3: Budget & Travelers ────────── */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Budget & Travelers</p>

                  {/* Budget with $ prefix */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">💰 Budget (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">$</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        placeholder="0.00"
                        className={`${inputClass()} pl-7`}
                      />
                    </div>
                  </div>

                  {/* Travelers */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-1.5 block">👥 Number of Travelers</label>
                    <input
                      type="number"
                      min={1}
                      value={travelers}
                      onChange={(e) => setTravelers(e.target.value)}
                      className={inputClass()}
                    />
                  </div>
                </div>

                {/* ─── Footer: Cancel + Save ──────────────── */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={onClose}
                    className="px-5 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    onClick={handleSave}
                    disabled={!destination.trim() || !!dateError || saveStatus === 'saving'}
                    className={[
                      'px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                      saveStatus === 'error'    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : saveStatus === 'saved'  ? 'bg-green-100 text-green-700'
                      : saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-not-allowed'
                      :                           'bg-blue-600 text-white hover:bg-blue-700',
                    ].join(' ')}
                  >
                    {saveStatus === 'saving'  ? 'Saving...'
                     : saveStatus === 'saved' ? '✓ Saved'
                     : saveStatus === 'error' ? 'Try Again'
                     :                          'Save Trip'}
                  </button>
                </div>

              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}