/**
 * OverviewTab — Redesigned Week 7
 *
 * Visual updates:
 *   - All emojis replaced with SVG icons
 *   - White cards with subtle warm shadows (ring-1 ring-black/[0.03])
 *   - Text uses ink color scale
 *   - Inner cells use surface-bg for gentle contrast
 *   - Matches Airbnb-style warm cohesive aesthetic
 */

import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { formatDate } from './helpers';
import PreTripChecklist from './PreTripChecklist';
import LiveToolsPanel from './LiveToolsPanel';
import ExpenseTracker from './ExpenseTracker';

interface OverviewTabProps {
  trip: Trip;
  phase: TripPhase;
  onTripUpdate: (updated: Trip) => void;
}

// ── SVG Icons ─────────────────────────────────────────────────
const GlobeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SparklesIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

export default function OverviewTab({ trip, phase, onTripUpdate }: OverviewTabProps) {
  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════
          PRE-TRIP CHECKLIST
          ══════════════════════════════════════════════════════ */}
      {phase === 'pre-trip' && (
        <PreTripChecklist trip={trip} onTripUpdate={onTripUpdate} />
      )}

      {/* ══════════════════════════════════════════════════════
          LIVE TOOLS PANEL
          ══════════════════════════════════════════════════════ */}
      {phase === 'active' && (
        <LiveToolsPanel trip={trip} />
      )}

      {/* ── About This Trip ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-2">About This Trip</h3>
        <p className="text-ink-secondary text-sm leading-relaxed">
          {trip.trip_metadata?.description ||
            `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} adventure to ${
              trip.destination
            }. Use the tabs above to plan your itinerary, book travel, or chat with the AI assistant.`}
        </p>
      </div>

      {/* ── Key Details grid ────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <h3 className="text-base font-semibold text-ink mb-4">Key Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Destination', value: trip.destination, Icon: GlobeIcon },
            {
              label: 'Duration',
              value: trip.duration_days ? `${trip.duration_days} days` : 'Not set',
              Icon: ClockIcon,
            },
            {
              label: 'Budget',
              value: trip.budget ? `$${trip.budget.toLocaleString()}` : 'Not set',
              Icon: CurrencyIcon,
            },
            { label: 'Travelers', value: `${trip.travelers_count}`, Icon: UsersIcon },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="bg-surface-bg rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-ink-tertiary mb-1">
                <Icon />
                <p className="text-xs uppercase tracking-wide">{label}</p>
              </div>
              <p className="text-sm font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Travel Dates card ───────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-ink-tertiary">
            <CalendarIcon />
          </div>
          <h3 className="text-base font-semibold text-ink">Travel Dates</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex-1 bg-surface-bg rounded-xl p-3 text-center">
            <p className="text-xs text-ink-tertiary uppercase mb-1">Departure</p>
            <p className="font-semibold text-ink">{formatDate(trip.start_date)}</p>
          </div>
          <svg className="w-5 h-5 text-ink-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          <div className="flex-1 bg-surface-bg rounded-xl p-3 text-center">
            <p className="text-xs text-ink-tertiary uppercase mb-1">Return</p>
            <p className="font-semibold text-ink">{formatDate(trip.end_date)}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          EXPENSE TRACKER
          ══════════════════════════════════════════════════════ */}
      <ExpenseTracker trip={trip} onTripUpdate={onTripUpdate} />

      {/* ── Travel Alerts — placeholder ─────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-amber-600">
            <AlertIcon />
          </div>
          <h3 className="text-base font-semibold text-ink">Travel Alerts & News</h3>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-amber-800 text-sm">
            <strong>Coming Soon</strong> — Real-time travel alerts and advisories for{' '}
            {trip.destination} will appear here.
          </p>
        </div>
      </div>

      {/* ── AI Recommendations — placeholder ────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-brand-600">
            <SparklesIcon />
          </div>
          <h3 className="text-base font-semibold text-ink">AI Recommendations</h3>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <p className="text-brand-800 text-sm">
            <strong>Coming Soon</strong> — Personalized recommendations for {trip.destination}{' '}
            powered by AI will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}