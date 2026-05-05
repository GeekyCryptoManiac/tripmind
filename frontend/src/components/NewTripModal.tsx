import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import type { Trip } from '../types';

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  onCreate: (trip: Trip) => void;
}

type SaveStatus = 'idle' | 'saving' | 'error';

export default function NewTripModal({ isOpen, onClose, onCreate }: Props) {
  const [destination, setDestination] = useState('');
  const [origin,      setOrigin]      = useState('Singapore');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [travelers,   setTravelers]   = useState('1');
  const [budget,      setBudget]      = useState('');
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>('idle');
  const [dateError,   setDateError]   = useState('');

  const durationDays = (() => {
    if (!startDate || !endDate) return null;
    const d = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000);
    return d > 0 ? d : null;
  })();

  const handleDateChange = (start: string, end: string) => {
    if (start && end && end <= start) {
      setDateError('End date must be after start date');
    } else {
      setDateError('');
    }
  };

  const handleClose = () => {
    setDestination(''); setOrigin('Singapore'); setStartDate(''); setEndDate('');
    setTravelers('1'); setBudget(''); setSaveStatus('idle'); setDateError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!destination.trim() || dateError || saveStatus === 'saving') return;

    setSaveStatus('saving');
    try {
      const payload: Record<string, unknown> = {
        destination:     destination.trim(),
        origin:          origin.trim() || 'Singapore',
        travelers_count: Math.max(1, parseInt(travelers) || 1),
      };
      if (startDate)                                 payload.start_date    = startDate;
      if (endDate && !dateError)                     payload.end_date      = endDate;
      if (durationDays)                              payload.duration_days = durationDays;
      if (budget !== '' && !isNaN(Number(budget)))   payload.budget        = parseFloat(budget);

      const trip = await apiService.createTrip(payload as Parameters<typeof apiService.createTrip>[0]);
      onCreate(trip);
      handleClose();
    } catch {
      setSaveStatus('error');
    }
  };

  const labelClass = 'block text-xs font-medium text-ink-secondary uppercase tracking-wide mb-1.5';
  const inputClass = 'w-full px-4 py-2.5 bg-surface-bg border border-surface-muted rounded-xl text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent transition';

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
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />

          <motion.div
            className="relative z-10 bg-white rounded-3xl shadow-modal w-full max-w-md overflow-hidden"
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.34, 1.4, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-surface-muted">
              <div>
                <h2 className="font-display text-xl text-ink">New trip</h2>
                <p className="text-sm text-ink-secondary mt-0.5">Fill in the basics — you can edit details later</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-muted text-ink-secondary hover:bg-gray-200 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="px-7 py-6 space-y-5">
              {/* Route row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>From</label>
                  <input
                    type="text"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Singapore"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Destination <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="Tokyo"
                    className={inputClass}
                    autoFocus
                  />
                </div>
              </div>

              {/* Dates row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); handleDateChange(e.target.value, endDate); }}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); handleDateChange(startDate, e.target.value); }}
                    className={inputClass}
                  />
                </div>
              </div>
              {dateError && <p className="text-xs text-rose-500 -mt-3">{dateError}</p>}
              {durationDays && !dateError && (
                <p className="text-xs text-ink-tertiary -mt-3">{durationDays} days</p>
              )}

              {/* Travelers + Budget row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Travelers</label>
                  <input
                    type="number"
                    min={1}
                    value={travelers}
                    onChange={(e) => setTravelers(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Budget (USD)</label>
                  <input
                    type="number"
                    min={0}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-7 pb-7 flex items-center justify-between gap-3">
              {saveStatus === 'error' && (
                <p className="text-xs text-rose-500">Something went wrong. Try again.</p>
              )}
              {saveStatus !== 'error' && <span />}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-ink-secondary bg-surface-muted hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!destination.trim() || !!dateError || saveStatus === 'saving'}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-ink text-white hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px]"
                >
                  {saveStatus === 'saving' ? 'Creating…' : 'Create trip'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
