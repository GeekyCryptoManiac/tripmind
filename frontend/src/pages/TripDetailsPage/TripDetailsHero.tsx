/**
 * TripDetailsHero — Redesigned Week 7
 *
 * Hero section with:
 *   - Soft lavender → warm cream gradient (matches HomePage)
 *   - Photo upload CTA with SVG camera icon
 *   - Display font for destination
 *   - Status badge using computed phase (not stored status)
 *   - Future: Unsplash photo for booked/completed trips
 *
 * Week 7 Fix: Uses computed `phase` prop instead of stored `trip.status`
 * to ensure badge reflects actual trip state based on dates
 */

import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { formatDateShort } from './helpers';

interface TripDetailsHeroProps {
  trip: Trip;
  phase: TripPhase; // Computed phase, not stored status
  onBack: () => void;
}

// Status badge config (matching TripCard)
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

// Camera icon SVG
const CameraIcon = () => (
  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default function TripDetailsHero({ trip, phase, onBack }: TripDetailsHeroProps) {
  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  return (
    <div className="relative w-full overflow-hidden" style={{ minHeight: '260px' }}>
      {/* Soft lavender → warm cream gradient (matches HomePage hero) */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #f3f0ff 0%, #fef3c7 50%, #F7F5F2 100%)',
        }}
      />

      {/* Decorative blob — top right lavender accent */}
      <div
        className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(232,228,248,0.6) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Photo upload CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 ring-1 ring-white/50">
          <div className="text-ink-tertiary">
            <CameraIcon />
          </div>
        </div>
        <p className="text-ink-secondary text-sm font-medium">Add Your Trip Photos</p>
        <button className="mt-3 px-4 py-2 bg-white/60 backdrop-blur-sm text-ink text-xs font-semibold rounded-xl ring-1 ring-black/5 hover:bg-white/80 transition-colors shadow-sm">
          + Upload Photos
        </button>
      </div>

      {/* Bottom overlay — trip name + status + back button */}
      <div className="absolute bottom-0 left-0 right-0 px-6 py-5 bg-gradient-to-t from-black/20 to-transparent">
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="font-display text-4xl text-ink drop-shadow-sm">{trip.destination}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <StatusBadge status={phase} />
              <span className="text-ink-secondary text-sm font-medium drop-shadow-sm">
                {formatDateShort(trip.start_date)}
                {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
                {endYear && `, ${endYear}`}
              </span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-ink-secondary text-sm font-medium hover:text-ink transition-colors flex items-center gap-1 bg-white/40 backdrop-blur-sm px-3 py-1.5 rounded-xl ring-1 ring-black/5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>
        </div>
      </div>

      {/* FUTURE: Unsplash photo for booked/completed trips
          Uncomment when photo system is ready:
          
          {(trip.status === 'booked' || trip.status === 'completed') && (
            <img
              src={getUnsplashUrl(trip)}
              alt={trip.destination}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
      */}
    </div>
  );
}