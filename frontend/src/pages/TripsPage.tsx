/**
 * TripsPage — Redesigned Week 7
 *
 * Visual language: clean editorial travel app — warm off-white surfaces,
 * strong typographic hierarchy, elevated cards, skeleton loaders.
 * All colours live in tailwind.config.js → swap the palette in one place.
 *
 * NOTE: Add these two lines to your index.html <head> for the fonts:
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap" rel="stylesheet">
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiService } from '../services/api';
import type { Trip } from '../types';
import WorldMap from '../components/WorldMap';
import MapLegend from '../components/MapLegend';
import TripCard from '../components/TripCard';
import { useTripPhase } from '../utils/tripStatus';
import { AnimatePresence, motion } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────
function formatDate(dateString: string | null): string {
  if (!dateString) return 'TBD';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return dateString; }
}

// Status config — tweak colours here if needed
const STATUS_CONFIG = {
  planning:  { label: 'Planning',  dot: 'bg-amber-400',  badge: 'bg-amber-50  text-amber-700  ring-amber-200'  },
  booked:    { label: 'Booked',    dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  completed: { label: 'Completed', dot: 'bg-brand-500',   badge: 'bg-brand-50  text-brand-700  ring-brand-200'  },
} as const;

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status, dot: 'bg-gray-400', badge: 'bg-gray-50 text-gray-600 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ── Loading skeletons ─────────────────────────────────────────
const CardSkeleton: FC = () => (
  <div className="bg-white rounded-2xl p-6 shadow-card animate-pulse">
    <div className="flex justify-between items-start mb-5">
      <div className="h-6 w-32 bg-gray-200 rounded-lg" />
      <div className="h-5 w-20 bg-gray-100 rounded-full" />
    </div>
    <div className="space-y-3">
      <div className="h-4 w-48 bg-gray-100 rounded" />
      <div className="h-4 w-36 bg-gray-100 rounded" />
      <div className="h-4 w-28 bg-gray-100 rounded" />
    </div>
    <div className="mt-5 pt-4 border-t border-gray-100">
      <div className="h-4 w-24 bg-gray-200 rounded" />
    </div>
  </div>
);

const PageSkeleton: FC = () => (
  <div className="min-h-screen bg-surface-bg">
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header skeleton */}
      <div className="flex items-end justify-between mb-10">
        <div className="space-y-3">
          <div className="h-10 w-40 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-5 w-64 bg-gray-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-100 rounded-xl animate-pulse" />
          <div className="h-10 w-36 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[1,2,3].map(i => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-card animate-pulse">
            <div className="h-4 w-16 bg-gray-100 rounded mb-3" />
            <div className="h-8 w-10 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
      </div>
    </div>
  </div>
);

// ── Trip selection modal ──────────────────────────────────────
interface TripSelectModalProps {
  trips: Trip[];
  countryName: string;
  onSelect: (trip: Trip) => void;
  onClose: () => void;
}

const TripSelectModal: FC<TripSelectModalProps> = ({ trips, countryName, onSelect, onClose }) => (
  <motion.div
    className="fixed inset-0 flex items-center justify-center z-50 p-4"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    onClick={onClose}
  >
    <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
    <motion.div
      className="relative z-10 bg-white rounded-3xl shadow-modal max-w-md w-full overflow-hidden"
      initial={{ scale: 0.94, y: 20, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.94, y: 20, opacity: 0 }}
      transition={{ duration: 0.22, ease: [0.34, 1.4, 0.64, 1] }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-7 pb-5">
        <div>
          <h3 className="font-display text-xl text-ink">{countryName}</h3>
          <p className="text-sm text-ink-secondary mt-0.5">
            {trips.length} trips · select one to view
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-muted text-ink-secondary hover:bg-gray-200 transition-colors text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="px-7 pb-7 space-y-2.5">
        {trips.map((trip) => {
            const { phase } = useTripPhase(trip);
            return (
              <button
                key={trip.id}
                onClick={() => onSelect(trip)}
                className="w-full text-left bg-surface-bg hover:bg-brand-50 border border-surface-muted hover:border-brand-200 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-ink group-hover:text-brand-700 transition-colors">
                    {trip.destination}
                  </p>
                  <StatusBadge status={phase} />
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-tertiary">
                  {trip.start_date && <span>{formatDate(trip.start_date)}</span>}
                  {trip.budget && <span>· ${trip.budget.toLocaleString()}</span>}
                  {trip.travelers_count > 0 && <span>· {trip.travelers_count} travelers</span>}
                </div>
              </button>
            );
        })}
      </div>
    </motion.div>
  </motion.div>
);

// ── Empty state ───────────────────────────────────────────────
const EmptyState: FC<{ onPlan: () => void }> = ({ onPlan }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className="flex flex-col items-center justify-center py-24 text-center"
  >
    {/* Illustrated placeholder */}
    <div className="relative mb-8">
      <div className="w-28 h-28 rounded-full bg-brand-50 flex items-center justify-center">
        <svg className="w-14 h-14 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      {/* Floating dots for decoration */}
      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-300 opacity-70" />
      <div className="absolute -bottom-1 -left-3 w-3 h-3 rounded-full bg-emerald-300 opacity-70" />
    </div>

    <h2 className="font-display text-2xl text-ink mb-2">No trips yet</h2>
    <p className="text-ink-secondary text-sm max-w-xs mb-8">
      Your next adventure is one conversation away. Let the AI plan it for you.
    </p>
    <button
      onClick={onPlan}
      className="inline-flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-2xl font-medium hover:bg-ink/80 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Plan my first trip
    </button>
  </motion.div>
);

// ── Stat chip ─────────────────────────────────────────────────
const StatChip: FC<{ label: string; count: number; color: string }> = ({ label, count, color }) => (
  <div className="bg-white rounded-2xl p-5 shadow-card flex items-center justify-between">
    <div>
      <p className="text-xs text-ink-tertiary uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-display ${color}`}>{count}</p>
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────
const TripsPage: FC = () => {
  const { userId } = useUser();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [modalData, setModalData] = useState<{ trips: Trip[]; countryName: string } | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
        setError(null);
        const fetchedTrips = await apiService.getUserTrips(userId);
        setTrips(fetchedTrips);
      } catch (err) {
        console.error('Failed to fetch trips:', err);
        setError('Failed to load trips. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, [userId]);

  // Compute phase-based counts (not stored status)
  const tripCounts = {
    planning:  trips.filter((t) => {
      const { phase } = useTripPhase(t);
      return phase === 'planning';
    }).length,
    booked:    trips.filter((t) => {
      const { phase } = useTripPhase(t);
      return phase === 'pre-trip' || phase === 'active'; // Both count as "booked"
    }).length,
    completed: trips.filter((t) => {
      const { phase } = useTripPhase(t);
      return phase === 'completed';
    }).length,
  };

  const handleCountryClick = (countryTrips: Trip[], countryName: string) => {
    if (countryTrips.length === 1) navigate(`/trips/${countryTrips[0].id}`);
    else if (countryTrips.length > 1) setModalData({ trips: countryTrips, countryName });
  };

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) return <PageSkeleton />;

  // ── Error ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-surface-bg flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-sm text-center">
          <p className="text-2xl mb-3">⚠️</p>
          <p className="text-red-800 font-medium mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium text-red-700 underline underline-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-bg">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* ── Page header ─────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-end justify-between mb-8"
        >
          <div>
            <p className="text-xs font-medium text-ink-tertiary uppercase tracking-widest mb-1">
              Your travel journal
            </p>
            <h1 className="font-display text-4xl text-ink">My Trips</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            {trips.length > 0 && (
              <div className="flex bg-white border border-surface-muted rounded-xl p-1 shadow-card">
                {(['map', 'list'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      viewMode === mode
                        ? 'bg-ink text-white shadow-sm'
                        : 'text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {mode === 'map' ? '🗺 Map' : '☰ List'}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center gap-2 bg-ink text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-ink/80 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Trip
            </button>
          </div>
        </motion.div>

        {/* ── Stats row (list view only) ──────────────────── */}
        {trips.length > 0 && viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            <div className="bg-ink rounded-2xl p-5 shadow-card">
              <p className="text-xs text-white/50 uppercase tracking-wide mb-1">Total</p>
              <p className="text-3xl font-display text-white">{trips.length}</p>
            </div>
            <StatChip label="Planning"  count={tripCounts.planning}  color="text-amber-500" />
            <StatChip label="Booked"    count={tripCounts.booked}    color="text-emerald-600" />
            <StatChip label="Completed" count={tripCounts.completed} color="text-brand-600" />
          </motion.div>
        )}

        {/* ── Empty state ─────────────────────────────────── */}
        {trips.length === 0 && <EmptyState onPlan={() => navigate('/chat')} />}

        {/* ── Map view ────────────────────────────────────── */}
        {trips.length > 0 && viewMode === 'map' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-5"
          >
            {/* Translucent sidebar — frosted glass effect */}
            <div className="lg:col-span-1 space-y-4">
              
              {/* ── Overview card ───────────────────────────── */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-card p-6 ring-1 ring-black/5">
                <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wide mb-1">
                  Your Travel Journal
                </p>
                <p className="text-5xl font-display text-ink mb-4">{trips.length}</p>
                <p className="text-xs text-ink-secondary">
                  {trips.length === 1 ? 'trip' : 'trips'} planned
                </p>
              </div>

              {/* ── Status breakdown ────────────────────────── */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-card p-6 ring-1 ring-black/5">
                <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wide mb-4">
                  Trip Status
                </p>
                <div className="space-y-3">
                  {[
                    { status: 'planning',  count: tripCounts.planning,  color: 'bg-amber-400',   label: 'Planning'  },
                    { status: 'booked',    count: tripCounts.booked,    color: 'bg-emerald-400', label: 'Booked'    },
                    { status: 'completed', count: tripCounts.completed, color: 'bg-brand-500',   label: 'Completed' },
                  ].map(({ status, count, color, label }) => {
                    const percentage = trips.length > 0 ? Math.round((count / trips.length) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-sm font-medium text-ink">{label}</span>
                          </div>
                          <span className="text-sm font-semibold text-ink">{count}</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-muted rounded-full overflow-hidden">
                          <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                        </div>
                        <p className="text-xs text-ink-tertiary mt-1">{percentage}% of trips</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Legend ──────────────────────────────────── */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-card p-6 ring-1 ring-black/5">
                <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wide mb-4">Legend</p>
                <MapLegend
                  planningCount={tripCounts.planning}
                  bookedCount={tripCounts.booked}
                  completedCount={tripCounts.completed}
                />
              </div>

              {/* ── Recent trips ────────────────────────────── */}
              <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-card p-6 ring-1 ring-black/5">
                <p className="text-xs font-medium text-ink-tertiary uppercase tracking-wide mb-4">Recent</p>
                <div className="space-y-3">
                  {trips.slice(0, 4).map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="w-full flex items-center justify-between group text-left"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          trip.status === 'planning'  ? 'bg-amber-400' :
                          trip.status === 'booked'    ? 'bg-emerald-400' :
                                                        'bg-brand-500'
                        }`} />
                        <span className="text-sm text-ink font-medium truncate group-hover:text-brand-600 transition-colors">
                          {trip.destination}
                        </span>
                      </div>
                      <svg className="w-3.5 h-3.5 text-ink-tertiary group-hover:text-brand-500 flex-shrink-0 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                  {trips.length > 4 && (
                    <p className="text-xs text-ink-tertiary pt-1">+{trips.length - 4} more trips</p>
                  )}
                </div>
              </div>
            </div>

            {/* Map — full bleed on the right */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-2xl shadow-card overflow-hidden">
                <WorldMap trips={trips} onCountryClick={handleCountryClick} />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── List view ───────────────────────────────────── */}
        {trips.length > 0 && viewMode === 'list' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {trips.map((trip, i) => {
              const { phase } = useTripPhase(trip); // Compute phase per trip
              return (
                <motion.div
                  key={trip.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                >
                  <TripCard trip={trip} phase={phase} onClick={() => navigate(`/trips/${trip.id}`)} />
                </motion.div>
              );
            })}
          </motion.div>
        )}

      </div>

      {/* ── Selection modal ──────────────────────────────── */}
      <AnimatePresence>
        {modalData && (
          <TripSelectModal
            trips={modalData.trips}
            countryName={modalData.countryName}
            onSelect={(trip) => { setModalData(null); navigate(`/trips/${trip.id}`); }}
            onClose={() => setModalData(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default TripsPage;