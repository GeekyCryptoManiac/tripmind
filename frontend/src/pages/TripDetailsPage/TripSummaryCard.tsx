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
 *
 * Sidebar restructuring: the `lg:w-80 xl:w-96 shrink-0` sizing this card
 * used to own itself now lives one level up, in TripDetailsPage/index.tsx,
 * wrapping this card and the relocated PreTripChecklist as two stacked
 * siblings in the same column.
 *
 * No sticky positioning anywhere in the sidebar — both cards scroll in
 * plain normal document flow. This was tried (sticky on this card alone,
 * then sticky + max-height + overflow-auto on the shared wrapper) but
 * removed deliberately: PreTripChecklist's length is now user-editable and
 * variable, which doesn't suit a fixed-height sticky sidebar. Revisit once
 * checklist length settles.
 */

import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { formatDateShort } from './helpers';
import TripStatusBadge from '../../components/TripStatusBadge';
import logoAsset from '../../assets/tagalong_logo.png';
import { convertToUSD } from '../../utils/currency';
import { EXPENSE_CATEGORY_STYLES } from '../../utils/categoryStyles';

interface TripSummaryCardProps {
  trip: Trip;
  phase: TripPhase; // Computed phase, not stored status
  progressPct: number;
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

const ClipboardIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

export default function TripSummaryCard({
  trip,
  phase,
  progressPct,
  onChatClick,
  onItineraryClick,
}: TripSummaryCardProps) {
  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  // Full route string from waypoints, same logic as TripDetailsHero
  const sortedWps = [...(trip.waypoints ?? [])].sort((a, b) => a.order_index - b.order_index);
  const routeLabel =
    sortedWps.length > 1
      ? sortedWps.map((w) => w.city).join(' → ')
      : trip.origin && trip.origin !== trip.destination
      ? `${trip.origin} → ${trip.destination}`
      : null;

  // Per-category actual-spending breakdown — same aggregation pattern as
  // ExpenseTracker.tsx's categoryTotals (filter trip.expenses by category,
  // sum via the shared convertToUSD utility, drop zero-total categories),
  // ported against the same trip.expenses data rather than reimplemented.
  const categoryTotals = Object.entries(EXPENSE_CATEGORY_STYLES)
    .map(([value, style]) => ({
      value,
      ...style,
      totalUSD: trip.expenses
        .filter((e) => e.category === value)
        .reduce((sum, e) => sum + convertToUSD(e.amount, e.currency), 0),
    }))
    .filter((c) => c.totalUSD > 0);

  return (
    <div className="bg-cream rounded-2xl border border-card-border shadow-sm p-6">
      <h3 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage mb-4 pb-3 border-b border-card-border">
        Trip Summary
      </h3>

      {/* Status badge */}
      <div className="mb-5">
        <TripStatusBadge status={phase} />
      </div>

      {/* Detail rows */}
      <div className="space-y-4">
        {/* Dates */}
        <div className="flex items-start gap-3">
          <div className="text-sage flex-shrink-0">
            <CalendarIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              {formatDateShort(trip.start_date)}
              {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
              {endYear && `, ${endYear}`}
            </p>
            <p className="text-xs text-sage">
              {trip.duration_days ? `${trip.duration_days} days` : 'Duration not set'}
            </p>
          </div>
        </div>

        {/* Budget */}
        <div className="flex items-start gap-3">
          <div className="text-sage flex-shrink-0">
            <CurrencyIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              {trip.budget ? `$${trip.budget.toLocaleString()}` : 'No budget set'}
            </p>
            <p className="text-xs text-sage">Total budget</p>
          </div>
        </div>

        {/* Travelers */}
        <div className="flex items-start gap-3">
          <div className="text-sage flex-shrink-0">
            <UsersIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">
              {trip.travelers_count} {trip.travelers_count === 1 ? 'traveler' : 'travelers'}
            </p>
            <p className="text-xs text-sage">
              {trip.budget && trip.travelers_count
                ? `$${Math.round(trip.budget / trip.travelers_count).toLocaleString()} per person`
                : 'Budget per person'}
            </p>
          </div>
        </div>

        {/* Destination / Route */}
        <div className="flex items-start gap-3">
          <div className="text-sage flex-shrink-0">
            <GlobeIcon />
          </div>
          <div>
            <p className="text-sm font-medium text-ink">{routeLabel ?? trip.destination}</p>
            <p className="text-xs text-sage">{routeLabel ? 'Route' : 'Destination'}</p>
          </div>
        </div>
      </div>

      {/* Spending by category — actual spend from trip.expenses, not a
          budgeted allocation (trip.budget carries no per-category split).
          Omitted entirely when nothing's been logged yet, rather than
          showing an empty breakdown. */}
      {categoryTotals.length > 0 && (
        <div className="mt-5 pt-5 border-t border-card-border">
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-sage mb-3">
            Spending by Category
          </p>
          <div className="space-y-2">
            {categoryTotals.map((cat) => (
              <div key={cat.value} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-sm text-ink min-w-0">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.dot }}
                  />
                  <span className="truncate">{cat.label}</span>
                </span>
                <span className="text-sm font-semibold text-ink flex-shrink-0">
                  ${cat.totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="mt-5 pt-5 border-t border-card-border">
        <div className="flex justify-between items-center mb-2">
          <p className="font-mono text-[9px] tracking-[0.1em] uppercase text-sage">Trip Completion</p>
          <p className="font-mono text-[9px] text-ink">{progressPct}%</p>
        </div>
        <div className="h-[3px] bg-card-border rounded-full overflow-hidden">
          <div
            className="h-full bg-marigold rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 pt-5 border-t border-card-border flex flex-col gap-2">
        <button
          onClick={onChatClick}
          className="w-full px-4 py-2.5 bg-teal text-cream rounded-xl text-sm font-semibold hover:bg-teal/90 transition-colors flex items-center justify-center gap-2"
        >
          <img src={logoAsset} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
          Ask Sherpa about this trip
        </button>
        <button
          onClick={onItineraryClick}
          className="w-full px-4 py-2.5 bg-cream text-ink rounded-xl text-sm font-semibold ring-1 ring-card-border hover:bg-terrain/20 transition-colors flex items-center justify-center gap-2"
        >
          <ClipboardIcon />
          Plan Itinerary
        </button>
      </div>
    </div>
  );
}
