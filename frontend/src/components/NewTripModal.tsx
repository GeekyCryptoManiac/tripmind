import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiService } from '../services/api';
import type { Trip, TripCreateRequest } from '../types';
import CityAutocomplete from './CityAutocomplete';
import type { CityEntry } from '../data/cities';

interface Props {
  isOpen:   boolean;
  onClose:  () => void;
  onCreate: (trip: Trip) => void;
}

type SaveStatus = 'idle' | 'saving' | 'error';

export default function NewTripModal({ isOpen, onClose, onCreate }: Props) {
  const [destination,        setDestination]        = useState('');
  const [destinationCountry, setDestinationCountry] = useState<CityEntry | null>(null);
  const [origin,             setOrigin]             = useState('Singapore');
  const [originCountry,      setOriginCountry]      = useState<CityEntry | null>(null);
  const [startDate,          setStartDate]          = useState('');
  const [endDate,            setEndDate]            = useState('');
  const [travelers,          setTravelers]          = useState('1');
  const [budget,             setBudget]             = useState('');
  const [saveStatus,         setSaveStatus]         = useState<SaveStatus>('idle');
  const [dateError,          setDateError]          = useState('');

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
    setDestination(''); setDestinationCountry(null);
    setOrigin('Singapore'); setOriginCountry(null);
    setStartDate(''); setEndDate('');
    setTravelers('1'); setBudget(''); setSaveStatus('idle'); setDateError('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!destination.trim() || dateError || saveStatus === 'saving') return;

    setSaveStatus('saving');
    try {
      const payload: TripCreateRequest = {
        destination:     destination.trim(),
        origin:          origin.trim() || 'Singapore',
        country_code:    destinationCountry?.country_code ?? undefined,
        travelers_count: Math.max(1, parseInt(travelers) || 1),
        ...(startDate                               && { start_date:    startDate }),
        ...(endDate && !dateError                   && { end_date:      endDate }),
        ...(durationDays                            && { duration_days: durationDays }),
        ...(budget !== '' && !isNaN(Number(budget)) && { budget:        parseFloat(budget) }),
      };

      const trip = await apiService.createTrip(payload);
      onCreate(trip);
      handleClose();
    } catch {
      setSaveStatus('error');
    }
  };

  const labelClass = 'block text-xs font-medium text-inkText-secondary uppercase tracking-wide mb-1.5';
  const inputClass = 'w-full px-4 py-2.5 bg-surface-bg border border-surface-muted rounded-xl text-sm text-inkText placeholder-inkText-tertiary focus:outline-none focus:ring-2 focus:ring-ink focus:border-transparent transition';
  void originCountry;

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
          <div className="absolute inset-0 bg-inkText/40 backdrop-blur-sm" />

          <motion.div
            className="relative z-10 bg-white rounded-3xl shadow-modal w-full max-w-md"
            initial={{ scale: 0.94, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.34, 1.4, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-7 pt-7 pb-5 border-b border-surface-muted">
              <div>
                <h2 className="font-display text-xl text-inkText">New trip</h2>
                <p className="text-sm text-inkText-secondary mt-0.5">Fill in the basics — you can edit details later</p>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-muted text-inkText-secondary hover:bg-ink/10 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div className="px-7 py-6 space-y-5">
              {/* Route row */}
              <div className="grid grid-cols-2 gap-4">
                <CityAutocomplete
                  label="From"
                  value={origin}
                  onChange={(city, entry) => { setOrigin(city); setOriginCountry(entry); }}
                  placeholder="Singapore"
                />
                <div>
                  <label className={labelClass}>
                    Destination <span className="text-marigold">*</span>
                  </label>
                  <CityAutocomplete
                    value={destination}
                    onChange={(city, entry) => { setDestination(city); setDestinationCountry(entry); }}
                    placeholder="Tokyo"
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
              {dateError && <p className="text-xs text-poppy -mt-3">{dateError}</p>}
              {durationDays && !dateError && (
                <p className="text-xs text-inkText-tertiary -mt-3">{durationDays} days</p>
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
                <p className="text-xs text-poppy">Something went wrong. Try again.</p>
              )}
              {saveStatus !== 'error' && <span />}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium text-inkText-secondary bg-surface-muted hover:bg-ink/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!destination.trim() || !!dateError || saveStatus === 'saving'}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-inkText text-white hover:bg-inkText/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-w-[90px]"
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
