/**
 * TripSummaryCard — Redesigned Week 7
 *
 * Sticky right-side summary card with:
 *   - Status badge using computed phase (not stored status)
 *   - SVG icons instead of emojis
 *   - Warm palette (surface-bg, ink colors)
 *   - Brand blue CTA button
 *   - White card with ring border
 *
 * Week 7 Fix: Uses computed `phase` prop instead of stored `trip.status`
 * to ensure badge reflects actual trip state based on dates
 */

import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { formatDateShort } from './helpers';

interface TripSummaryCardProps {
  trip: Trip;
  phase: TripPhase; // Computed phase, not stored status
  progressPct: number;
  progressColor: string;
  onChatClick: () => void;
  onItineraryClick: () => void;
}

// ── SVG Icons ─────────────────────────────────────────────────
const CalendarIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const CurrencyIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const GlobeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChatIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const ClipboardIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

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

export default function TripSummaryCard({
  trip,
  phase,
  progressPct,
  progressColor,
  onChatClick,
  onItineraryClick,
}: TripSummaryCardProps) {
  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  return (
    <div className="lg:w-80 xl:w-96 shrink-0">
      <div className="lg:sticky lg:top-4 bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-4 pb-3 border-b border-surface-muted">
          Trip Summary
        </h3>

        {/* Status badge */}
        <div className="mb-5">
          <StatusBadge status={phase} />
        </div>

        {/* Detail rows */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="flex items-start gap-3">
            <div className="text-ink-tertiary flex-shrink-0">
              <CalendarIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                {formatDateShort(trip.start_date)}
                {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
                {endYear && `, ${endYear}`}
              </p>
              <p className="text-xs text-ink-tertiary">
                {trip.duration_days ? `${trip.duration_days} days` : 'Duration not set'}
              </p>
            </div>
          </div>

          {/* Budget */}
          <div className="flex items-start gap-3">
            <div className="text-ink-tertiary flex-shrink-0">
              <CurrencyIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                {trip.budget ? `$${trip.budget.toLocaleString()}` : 'No budget set'}
              </p>
              <p className="text-xs text-ink-tertiary">Total budget</p>
            </div>
          </div>

          {/* Travelers */}
          <div className="flex items-start gap-3">
            <div className="text-ink-tertiary flex-shrink-0">
              <UsersIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">
                {trip.travelers_count} {trip.travelers_count === 1 ? 'traveler' : 'travelers'}
              </p>
              <p className="text-xs text-ink-tertiary">
                {trip.budget && trip.travelers_count
                  ? `$${Math.round(trip.budget / trip.travelers_count).toLocaleString()} per person`
                  : 'Budget per person'}
              </p>
            </div>
          </div>

          {/* Destination */}
          <div className="flex items-start gap-3">
            <div className="text-ink-tertiary flex-shrink-0">
              <GlobeIcon />
            </div>
            <div>
              <p className="text-sm font-medium text-ink">{trip.destination}</p>
              <p className="text-xs text-ink-tertiary">Destination</p>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5 pt-5 border-t border-surface-muted">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium text-ink-tertiary">Trip Completion</p>
            <p className="text-xs font-bold text-ink">{progressPct}%</p>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: progressColor }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 pt-5 border-t border-surface-muted flex flex-col gap-2">
          <button
            onClick={onChatClick}
            className="w-full px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors flex items-center justify-center gap-2"
          >
            <ChatIcon />
            Chat About This Trip
          </button>
          <button
            onClick={onItineraryClick}
            className="w-full px-4 py-2.5 bg-white text-ink rounded-xl text-sm font-semibold ring-1 ring-surface-muted hover:bg-surface-bg transition-colors flex items-center justify-center gap-2"
          >
            <ClipboardIcon />
            Plan Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}