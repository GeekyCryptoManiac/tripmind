/**
 * StatusBanner
 *
 * A full-width contextual banner rendered between the progress bar
 * and the tab navigation in TripDetailsPage.
 *
 * Returns null for the 'planning' phase — no visual noise when
 * the trip is still being planned.
 *
 * Visual spec per handoff:
 *   pre-trip  → amber-50 bg, amber-200 border, amber-600 text
 *   active    → green-50 bg, green-200 border, green-700 text
 *   completed → gray-50 bg,  gray-200 border,  gray-500 text
 */

import { motion } from 'framer-motion';
import type { TripPhase } from '../../utils/tripStatus';

interface StatusBannerProps {
  phase: TripPhase;
  daysUntil: number;     // days until trip starts  (pre-trip only)
  currentDay: number;    // which day of trip today is (active only)
  totalDays: number;     // trip.duration_days
  destination: string;   // for personalised copy
}

// ── Per-phase configuration ────────────────────────────────────
type PhaseConfig = {
  wrapperBg:    string;
  wrapperBorder: string;
  badgeBg:      string;
  badgeText:    string;
  badgeLabel:   string;
  titleColor:   string;
  subtitleColor: string;
  icon:         string;
};

const PHASE_CONFIG: Record<Exclude<TripPhase, 'planning'>, PhaseConfig> = {
  'pre-trip': {
    wrapperBg:     'bg-amber-50',
    wrapperBorder: 'border-amber-200',
    badgeBg:       'bg-amber-100',
    badgeText:     'text-amber-700',
    badgeLabel:    'PRE-TRIP',
    titleColor:    'text-amber-800',
    subtitleColor: 'text-amber-700',
    icon:          '⏳',
  },
  active: {
    wrapperBg:     'bg-green-50',
    wrapperBorder: 'border-green-200',
    badgeBg:       'bg-green-100',
    badgeText:     'text-green-700',
    badgeLabel:    'LIVE',
    titleColor:    'text-green-800',
    subtitleColor: 'text-green-700',
    icon:          '✈️',
  },
  completed: {
    wrapperBg:     'bg-gray-50',
    wrapperBorder: 'border-gray-200',
    badgeBg:       'bg-gray-100',
    badgeText:     'text-gray-500',
    badgeLabel:    'COMPLETED',
    titleColor:    'text-gray-700',
    subtitleColor: 'text-gray-500',
    icon:          '✅',
  },
};

export default function StatusBanner({
  phase,
  daysUntil,
  currentDay,
  totalDays,
  destination,
}: StatusBannerProps) {
  // Planning phase → no banner
  if (phase === 'planning') return null;

  const cfg = PHASE_CONFIG[phase];

  // ── Dynamic title & subtitle per phase ──────────────────────
  const title = {
    'pre-trip':  `Trip starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
    active:      `Day ${currentDay} of ${totalDays} — Trip in Progress!`,
    completed:   `Trip to ${destination} is complete`,
  }[phase];

  const subtitle = {
    'pre-trip':  `Get ready for ${destination}! Check your pre-trip checklist in the Overview tab.`,
    active:      `You're currently in ${destination}. Check today's activities in the Itinerary tab.`,
    completed:   `Hope it was an amazing adventure! Your trip details are preserved below.`,
  }[phase];

  // ── Inline progress bar (active only) ───────────────────────
  const progressPct = Math.min(100, Math.round((currentDay / Math.max(totalDays, 1)) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`${cfg.wrapperBg} border-b ${cfg.wrapperBorder}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">

          {/* Icon */}
          <span className="text-xl flex-shrink-0" role="img" aria-hidden>
            {cfg.icon}
          </span>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Phase badge */}
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-full
                  text-xs font-bold tracking-wide
                  ${cfg.badgeBg} ${cfg.badgeText}
                `}
              >
                {cfg.badgeLabel}
              </span>
              {/* Main title */}
              <span className={`text-sm font-semibold ${cfg.titleColor}`}>
                {title}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${cfg.subtitleColor}`}>
              {subtitle}
            </p>
          </div>

          {/* ── Right side: contextual indicator ─────────────── */}

          {/* Pre-trip: large countdown number */}
          {phase === 'pre-trip' && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className="text-2xl font-bold text-amber-600 leading-none">
                {daysUntil}
              </div>
              <div className="text-xs text-amber-500 mt-0.5">
                days to go
              </div>
            </div>
          )}

          {/* Active: mini progress bar */}
          {phase === 'active' && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className="text-xs text-green-600 font-medium mb-1">
                {progressPct}% through
              </div>
              <div className="w-28 bg-green-200 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  className="bg-green-500 h-1.5 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}

          {/* Completed: no right-side widget needed */}
        </div>
      </div>
    </motion.div>
  );
}