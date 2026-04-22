/**
 * TravelTab — Round 1 Migration
 *
 * Changes:
 *   - trip.trip_metadata?.flights/hotels/transport removed
 *     → trip.saved_travel.filter(t => t.type === '...') instead
 *   - Saved item cards now take SavedTravel, render from item.data
 *   - Delete button wired up on saved cards:
 *     apiService.deleteSavedTravel(tripId, id) → getTrip → onTripUpdate
 *   - AIPanel handleSave: { type, data } (was { type, item }),
 *     saveTravelItem returns SavedTravel so getTrip called after
 *   - Type imports updated: FlightSuggestion/HotelSuggestion/TransportSuggestion
 *     for AI result cards; SavedTravel for persisted cards
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Trip,
  SavedTravel,
  FlightSuggestion,
  HotelSuggestion,
  TransportSuggestion,
  TravelSuggestType,
} from '../../types';
import type { TravelSubTab } from './helpers';
import { apiService } from '../../services/api';

interface TravelTabProps {
  trip: Trip;
  activeSubTab: TravelSubTab;
  onSubTabChange: (tab: TravelSubTab) => void;
  onTripUpdate?: (trip: Trip) => void;
}

// ── SVG Icons ─────────────────────────────────────────────────
const FlightIcon    = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const HotelIcon     = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TransportIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
);

const SparklesIcon  = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const CheckIcon     = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon         = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TrashIcon     = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const StarIcon      = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

// ── Typing dots ───────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-brand-400 rounded-full"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ── Status badge ──────────────────────────────────────────────
function AISuggestedBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full ring-1 ring-brand-200">
      <SparklesIcon className="w-3 h-3" />
      AI Suggested
    </span>
  );
}

// ── Saved item cards ──────────────────────────────────────────
// Each card receives SavedTravel and casts item.data to the appropriate suggestion shape.

interface SavedCardBaseProps {
  item: SavedTravel;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

function SavedFlightCard({ item, onDelete, isDeleting }: SavedCardBaseProps) {
  const flight = item.data as unknown as FlightSuggestion;
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-ink">{flight.airline}</p>
          <p className="text-xs text-ink-tertiary mt-0.5">{flight.flight_number}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
            Saved
          </span>
          <button
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
            title="Remove saved item"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-ink-tertiary/30 border-t-ink-tertiary rounded-full animate-spin" />
            ) : (
              <TrashIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 text-sm text-ink mb-2">
        <span className="font-mono font-semibold">{flight.from}</span>
        <span className="flex-1 border-t-2 border-dashed border-surface-muted relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 text-ink-tertiary text-xs">
            {flight.duration}
          </span>
        </span>
        <span className="font-mono font-semibold">{flight.to}</span>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-secondary">
        <span>{flight.departure} → {flight.arrival}</span>
        {flight.estimated_price && (
          <span className="font-semibold text-ink">${flight.estimated_price}/pax</span>
        )}
      </div>
      {flight.notes && (
        <p className="mt-2 text-xs text-ink-tertiary bg-surface-bg rounded-lg px-3 py-1.5">{flight.notes}</p>
      )}
    </div>
  );
}

function SavedHotelCard({ item, onDelete, isDeleting }: SavedCardBaseProps) {
  const hotel = item.data as unknown as HotelSuggestion;
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-ink">{hotel.name}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{hotel.area}, {hotel.location}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">Saved</span>
          <button
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
            title="Remove saved item"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-ink-tertiary/30 border-t-ink-tertiary rounded-full animate-spin" />
            ) : (
              <TrashIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      {hotel.star_rating && (
        <div className="flex items-center gap-0.5 mb-2">
          {Array.from({ length: hotel.star_rating }).map((_, i) => (
            <StarIcon key={i} className="w-3.5 h-3.5 text-amber-400" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between text-xs text-ink-secondary mt-1">
        <span>{hotel.highlights?.slice(0, 2).join(' · ')}</span>
        {hotel.price_per_night && (
          <span className="font-semibold text-ink">${hotel.price_per_night}/night</span>
        )}
      </div>
      {hotel.notes && (
        <p className="mt-2 text-xs text-ink-tertiary bg-surface-bg rounded-lg px-3 py-1.5">{hotel.notes}</p>
      )}
    </div>
  );
}

function SavedTransportCard({ item, onDelete, isDeleting }: SavedCardBaseProps) {
  const transport = item.data as unknown as TransportSuggestion;
  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.05] shadow-sm p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-ink">{transport.title}</p>
          <p className="text-xs text-ink-secondary capitalize mt-0.5">{transport.type}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full ring-1 ring-emerald-200">Saved</span>
          <button
            onClick={() => onDelete(item.id)}
            disabled={isDeleting}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-tertiary hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
            title="Remove saved item"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-ink-tertiary/30 border-t-ink-tertiary rounded-full animate-spin" />
            ) : (
              <TrashIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      <p className="text-sm text-ink-secondary mb-2">{transport.description}</p>
      {transport.pros && transport.pros.length > 0 && (
        <ul className="space-y-0.5 mb-2">
          {transport.pros.slice(0, 3).map((pro, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <CheckIcon className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              {pro}
            </li>
          ))}
        </ul>
      )}
      {transport.estimated_cost && (
        <p className="text-xs font-semibold text-ink">
          ~${transport.estimated_cost} {transport.cost_unit && `(${transport.cost_unit})`}
        </p>
      )}
    </div>
  );
}

// ── Suggestion result cards (before saving) ───────────────────

function FlightResultCard({
  flight, onSave, isSaving, isSaved,
}: {
  flight: FlightSuggestion;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl ring-1 p-5 transition-all ${isSaved ? 'ring-emerald-300 bg-emerald-50/30' : 'ring-brand-200 bg-brand-50/20'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-ink">{flight.airline}</p>
          <p className="text-xs text-ink-tertiary">{flight.flight_number} · {flight.cabin || 'Economy'}</p>
        </div>
        <AISuggestedBadge />
      </div>
      <div className="flex items-center gap-3 text-sm text-ink mb-2">
        <span className="font-mono font-bold text-base">{flight.from}</span>
        <div className="flex-1 flex flex-col items-center">
          <span className="text-xs text-ink-tertiary mb-0.5">{flight.duration}</span>
          <div className="w-full border-t-2 border-dashed border-brand-200" />
        </div>
        <span className="font-mono font-bold text-base">{flight.to}</span>
      </div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-secondary">{flight.departure} → {flight.arrival}</span>
        {flight.estimated_price && (
          <span className="text-lg font-bold text-ink">
            ${flight.estimated_price}<span className="text-xs font-normal text-ink-tertiary">/pax</span>
          </span>
        )}
      </div>
      {flight.notes && <p className="text-xs text-ink-tertiary mb-3">{flight.notes}</p>}
      <button
        onClick={onSave}
        disabled={isSaving || isSaved}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          isSaved
            ? 'bg-emerald-100 text-emerald-700 cursor-default'
            : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
        }`}
      >
        {isSaving ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
        ) : isSaved ? (
          <><CheckIcon /> Saved to Trip</>
        ) : 'Save to Trip'}
      </button>
    </div>
  );
}

function HotelResultCard({
  hotel, onSave, isSaving, isSaved,
}: {
  hotel: HotelSuggestion;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl ring-1 p-5 transition-all ${isSaved ? 'ring-emerald-300 bg-emerald-50/30' : 'ring-brand-200 bg-brand-50/20'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-ink">{hotel.name}</p>
          <p className="text-xs text-ink-secondary">{hotel.area}, {hotel.location}</p>
        </div>
        <AISuggestedBadge />
      </div>
      {hotel.star_rating && (
        <div className="flex items-center gap-0.5 mb-2">
          {Array.from({ length: hotel.star_rating }).map((_, i) => (
            <StarIcon key={i} className="w-3.5 h-3.5 text-amber-400" />
          ))}
        </div>
      )}
      {hotel.highlights && hotel.highlights.length > 0 && (
        <ul className="space-y-0.5 mb-2">
          {hotel.highlights.map((h, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <CheckIcon className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              {h}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-tertiary">Check-in {hotel.check_in} · Check-out {hotel.check_out}</span>
        {hotel.price_per_night && (
          <span className="text-lg font-bold text-ink">
            ${hotel.price_per_night}<span className="text-xs font-normal text-ink-tertiary">/night</span>
          </span>
        )}
      </div>
      {hotel.notes && <p className="text-xs text-ink-tertiary mb-3">{hotel.notes}</p>}
      <button
        onClick={onSave}
        disabled={isSaving || isSaved}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          isSaved
            ? 'bg-emerald-100 text-emerald-700 cursor-default'
            : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
        }`}
      >
        {isSaving ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
        ) : isSaved ? (
          <><CheckIcon /> Saved to Trip</>
        ) : 'Save to Trip'}
      </button>
    </div>
  );
}

function TransportResultCard({
  transport, onSave, isSaving, isSaved,
}: {
  transport: TransportSuggestion;
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl ring-1 p-5 transition-all ${isSaved ? 'ring-emerald-300 bg-emerald-50/30' : 'ring-brand-200 bg-brand-50/20'}`}>
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-ink">{transport.title}</p>
          <p className="text-xs text-ink-secondary capitalize">{transport.type}</p>
        </div>
        <AISuggestedBadge />
      </div>
      <p className="text-sm text-ink-secondary mb-2">{transport.description}</p>
      {transport.pros && transport.pros.length > 0 && (
        <ul className="space-y-0.5 mb-2">
          {transport.pros.map((p, i) => (
            <li key={i} className="flex items-center gap-1.5 text-xs text-ink-secondary">
              <CheckIcon className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-ink-tertiary" />
        {transport.estimated_cost && (
          <span className="text-lg font-bold text-ink">
            ~${transport.estimated_cost}
            <span className="text-xs font-normal text-ink-tertiary ml-1">{transport.cost_unit}</span>
          </span>
        )}
      </div>
      {transport.notes && <p className="text-xs text-ink-tertiary mb-3">{transport.notes}</p>}
      <button
        onClick={onSave}
        disabled={isSaving || isSaved}
        className={`w-full py-2 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          isSaved
            ? 'bg-emerald-100 text-emerald-700 cursor-default'
            : 'bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50'
        }`}
      >
        {isSaving ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
        ) : isSaved ? (
          <><CheckIcon /> Saved to Trip</>
        ) : 'Save to Trip'}
      </button>
    </div>
  );
}

// ── AI Panel ──────────────────────────────────────────────────
interface AIPanelProps {
  trip: Trip;
  type: TravelSuggestType;
  onClose: () => void;
  onTripUpdate?: (trip: Trip) => void;
}

function AIPanel({ trip, type, onClose, onTripUpdate }: AIPanelProps) {
  const suggestKey = `tripmind_suggestions_${trip.id}_${type}`;
  const savedKey   = `tripmind_saved_ids_${trip.id}_${type}`;

  function readSuggestions(): (FlightSuggestion | HotelSuggestion | TransportSuggestion)[] {
    try {
      const raw = sessionStorage.getItem(suggestKey);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function readSavedIds(): Set<string> {
    try {
      const raw = sessionStorage.getItem(savedKey);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  }

  const [preferences, setPreferences] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [suggestions, setSuggestionsState] = useState<(FlightSuggestion | HotelSuggestion | TransportSuggestion)[]>(readSuggestions);
  const [savingId, setSavingId]       = useState<string | null>(null);
  const [savedIds, setSavedIdsState]  = useState<Set<string>>(readSavedIds);

  const setSuggestions = (items: (FlightSuggestion | HotelSuggestion | TransportSuggestion)[]) => {
    setSuggestionsState(items);
    try { sessionStorage.setItem(suggestKey, JSON.stringify(items)); } catch { /* quota */ }
  };

  const addSavedId = (id: string) => {
    setSavedIdsState((prev) => {
      const next = new Set([...prev, id]);
      try { sessionStorage.setItem(savedKey, JSON.stringify([...next])); } catch { /* quota */ }
      return next;
    });
  };

  const contextLine = [
    trip.destination,
    trip.start_date && trip.end_date ? `${trip.start_date} → ${trip.end_date}` : null,
    trip.travelers_count ? `${trip.travelers_count} traveler${trip.travelers_count > 1 ? 's' : ''}` : null,
    trip.budget ? `$${trip.budget.toLocaleString()} budget` : null,
  ].filter(Boolean).join(' · ');

  const placeholder: Record<TravelSuggestType, string> = {
    flight:    'e.g. direct flights only, prefer morning departures, business class',
    hotel:     'e.g. near city centre, 4-star+, free breakfast, pool',
    transport: 'e.g. prefer public transport, avoid taxis, need airport transfer',
  };

  const handleSearch = async () => {
    setIsSearching(true);
    setError(null);
    setSuggestions([]);
    try {
      const result = await apiService.suggestTravel(trip.id, {
        type,
        preferences: preferences.trim() || undefined,
      });
      const items = result.flights ?? result.hotels ?? result.transport ?? [];
      setSuggestions(items as (FlightSuggestion | HotelSuggestion | TransportSuggestion)[]);
    } catch (err) {
      console.error('[AIPanel] Suggest failed:', err);
      setError('Could not generate suggestions. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSave = async (item: FlightSuggestion | HotelSuggestion | TransportSuggestion) => {
    setSavingId(item.id);
    try {
      // saveTravelItem returns SavedTravel (not Trip) — refresh trip separately
      await apiService.saveTravelItem(trip.id, {
        type,
        data: item as unknown as Record<string, unknown>,
      });
      const updatedTrip = await apiService.getTrip(trip.id);
      addSavedId(item.id);
      if (onTripUpdate) onTripUpdate(updatedTrip);
    } catch (err) {
      console.error('[AIPanel] Save failed:', err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="border-t border-surface-muted bg-gradient-to-b from-brand-50/40 to-white p-6">
        {/* Panel header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <SparklesIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink capitalize">Find {type} with AI</p>
              <p className="text-xs text-ink-tertiary">{contextLine}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-bg text-ink-tertiary hover:text-ink hover:bg-surface-muted transition-colors"
          >
            <XIcon />
          </button>
        </div>

        {/* Preferences input */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-ink-secondary mb-1.5">
            Preferences <span className="text-ink-tertiary font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder={placeholder[type]}
            onKeyDown={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
            className="w-full px-4 py-2.5 bg-white border border-surface-muted rounded-xl text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent transition-colors"
          />
        </div>

        {suggestions.length === 0 && !isSearching && (
          <button
            onClick={handleSearch}
            className="w-full py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
          >
            <SparklesIcon />
            Search with AI
          </button>
        )}

        {isSearching && (
          <div className="flex items-center gap-3 py-2">
            <TypingDots />
            <span className="text-sm text-ink-secondary">
              Finding the best {type} for {trip.destination}...
            </span>
          </div>
        )}

        {error && (
          <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        {suggestions.length > 0 && (
          <div className="mt-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-ink-secondary">
                {suggestions.length} suggestions · tap to save any to your trip
              </p>
              <button
                onClick={handleSearch}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                Regenerate
              </button>
            </div>

            {type === 'flight' && (suggestions as FlightSuggestion[]).map((f) => (
              <FlightResultCard
                key={f.id}
                flight={f}
                onSave={() => handleSave(f)}
                isSaving={savingId === f.id}
                isSaved={savedIds.has(f.id)}
              />
            ))}
            {type === 'hotel' && (suggestions as HotelSuggestion[]).map((h) => (
              <HotelResultCard
                key={h.id}
                hotel={h}
                onSave={() => handleSave(h)}
                isSaving={savingId === h.id}
                isSaved={savedIds.has(h.id)}
              />
            ))}
            {type === 'transport' && (suggestions as TransportSuggestion[]).map((t) => (
              <TransportResultCard
                key={t.id}
                transport={t}
                onSave={() => handleSave(t)}
                isSaving={savingId === t.id}
                isSaved={savedIds.has(t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main TravelTab ────────────────────────────────────────────
export default function TravelTab({
  trip,
  activeSubTab,
  onSubTabChange,
  onTripUpdate,
}: TravelTabProps) {
  function hasCachedSuggestions(tripId: number, type: TravelSubTab): boolean {
    try {
      const singular: Record<TravelSubTab, TravelSuggestType> = { flights: 'flight', hotels: 'hotel', transport: 'transport' };
      const raw = sessionStorage.getItem(`tripmind_suggestions_${tripId}_${singular[type]}`);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0;
    } catch { return false; }
  }

  const [aiPanelOpen, setAIPanelOpen] = useState(() =>
    hasCachedSuggestions(trip.id, activeSubTab)
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const handleSubTabChange = (tab: TravelSubTab) => {
    setAIPanelOpen(hasCachedSuggestions(trip.id, tab));
    onSubTabChange(tab);
  };

  const handleDeleteSaved = async (id: number) => {
    setDeletingId(id);
    try {
      await apiService.deleteSavedTravel(trip.id, id);
      const updatedTrip = await apiService.getTrip(trip.id);
      if (onTripUpdate) onTripUpdate(updatedTrip);
    } catch (err) {
      console.error('[TravelTab] Delete saved item failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const tabs = [
    { key: 'flights'   as const, label: 'Flights',   Icon: FlightIcon    },
    { key: 'hotels'    as const, label: 'Hotels',    Icon: HotelIcon     },
    { key: 'transport' as const, label: 'Transport', Icon: TransportIcon },
  ];

  const activeTabConfig = tabs.find((t) => t.key === activeSubTab)!;

  // Derive saved items from normalized saved_travel list
  const savedFlights   = trip.saved_travel.filter((t) => t.type === 'flight');
  const savedHotels    = trip.saved_travel.filter((t) => t.type === 'hotel');
  const savedTransport = trip.saved_travel.filter((t) => t.type === 'transport');

  const hasSavedItems =
    activeSubTab === 'flights'   ? savedFlights.length > 0 :
    activeSubTab === 'hotels'    ? savedHotels.length > 0  :
                                   savedTransport.length > 0;

  // Map sub-tab key to TravelSuggestType (TravelType uses singular)
  const suggestTypeMap: Record<TravelSubTab, TravelSuggestType> = {
    flights:   'flight',
    hotels:    'hotel',
    transport: 'transport',
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm overflow-hidden">

      {/* Sub-tab bar */}
      <div className="flex border-b border-surface-muted">
        {tabs.map(({ key, label, Icon }) => {
          const count =
            key === 'flights'   ? savedFlights.length :
            key === 'hotels'    ? savedHotels.length  :
                                  savedTransport.length;
          return (
            <button
              key={key}
              onClick={() => handleSubTabChange(key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
                ${activeSubTab === key
                  ? 'bg-brand-50 text-brand-700 border-b-2 border-brand-600'
                  : 'text-ink-secondary hover:text-ink hover:bg-surface-bg'
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {count > 0 && (
                <span className="ml-1 text-xs bg-brand-100 text-brand-700 rounded-full px-1.5 py-0.5 font-semibold">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* ── Saved items list ─────────────────────────── */}
          {hasSavedItems && (
            <div className="p-5 space-y-3">
              {activeSubTab === 'flights'   && savedFlights.map((item) => (
                <SavedFlightCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteSaved}
                  isDeleting={deletingId === item.id}
                />
              ))}
              {activeSubTab === 'hotels'    && savedHotels.map((item) => (
                <SavedHotelCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteSaved}
                  isDeleting={deletingId === item.id}
                />
              ))}
              {activeSubTab === 'transport' && savedTransport.map((item) => (
                <SavedTransportCard
                  key={item.id}
                  item={item}
                  onDelete={handleDeleteSaved}
                  isDeleting={deletingId === item.id}
                />
              ))}

              {/* Find more button */}
              {!aiPanelOpen && (
                <button
                  onClick={() => setAIPanelOpen(true)}
                  className="w-full py-2.5 text-sm font-medium text-brand-600 hover:text-brand-700 border-2 border-dashed border-brand-200 hover:border-brand-400 rounded-2xl transition-colors flex items-center justify-center gap-2"
                >
                  <SparklesIcon />
                  Find more with AI
                </button>
              )}
            </div>
          )}

          {/* ── Empty state ──────────────────────────────── */}
          {!hasSavedItems && !aiPanelOpen && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <activeTabConfig.Icon className="w-8 h-8 text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-ink mb-2">
                No {activeSubTab} saved yet
              </h3>
              <p className="text-ink-secondary text-sm mb-6 max-w-xs mx-auto">
                {activeSubTab === 'flights'   && `Find the best flights for your ${trip.destination} trip`}
                {activeSubTab === 'hotels'    && `Find accommodation in ${trip.destination}`}
                {activeSubTab === 'transport' && `Plan how to get around ${trip.destination}`}
              </p>
              <button
                onClick={() => setAIPanelOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors shadow-sm"
              >
                <SparklesIcon />
                Find with AI
              </button>
            </div>
          )}

          {/* ── AI Panel ─────────────────────────────────── */}
          <AnimatePresence>
            {aiPanelOpen && (
              <AIPanel
                trip={trip}
                type={suggestTypeMap[activeSubTab]}
                onClose={() => setAIPanelOpen(false)}
                onTripUpdate={onTripUpdate}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}