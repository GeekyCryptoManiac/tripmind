/**
 * StatusBanner — Redesigned Week 7
 *
 * Contextual banner between progress bar and tab navigation.
 * Returns null for 'planning' phase.
 *
 * Color palette — each phase now genuinely uses a distinct token (previously
 * all three rendered with the identical #EEF6F1/#C8D8C2 pair despite this
 * comment claiming otherwise — that was the actual bug, now fixed):
 *   pre-trip  → status.planning (amber family)
 *   active    → ink, NOT marigold — the Navbar's "+ New Trip" CTA is already
 *               marigold and visible on every screen this banner can appear
 *               on, so reusing marigold here would compete with it for
 *               attention. ink matches the "you are here now" convention
 *               already used elsewhere (e.g. TripSummaryCard's status dots).
 *   completed → status.completed (a darker/muted sage, distinct from
 *               status.booked's lighter sage)
 *
 * All emojis replaced with SVG icons for visual consistency.
 */

import { motion } from 'framer-motion';
import type { TripPhase } from '../../utils/tripStatus';

interface StatusBannerProps {
  phase: TripPhase;
  daysUntil: number;
  currentDay: number;
  totalDays: number;
  destination: string;
}

// ── SVG Icons ─────────────────────────────────────────────────
const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AirplaneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ── Per-phase configuration ───────────────────────────────────
type PhaseConfig = {
  bg: string;
  border: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
  titleColor: string;
  subtitleColor: string;
  iconColor: string;
  icon: React.ComponentType;
};

const PHASE_CONFIG: Record<Exclude<TripPhase, 'planning'>, PhaseConfig> = {
  'pre-trip': {
    bg: 'bg-status-planning-bg',
    border: 'border-status-planning-text/20',
    badgeBg: 'bg-status-planning-text',
    badgeText: 'text-status-planning-bg font-mono text-[9px] tracking-[0.1em]',
    badgeLabel: 'PRE-TRIP',
    titleColor: 'text-status-planning-text',
    subtitleColor: 'text-status-planning-text/80',
    iconColor: 'text-marigold',
    icon: ClockIcon,
  },
  active: {
    bg: 'bg-ink/10',
    border: 'border-ink/20',
    badgeBg: 'bg-ink',
    badgeText: 'text-cream font-mono text-[9px] tracking-[0.1em]',
    badgeLabel: 'LIVE',
    titleColor: 'text-ink',
    subtitleColor: 'text-ink/70',
    iconColor: 'text-ink',
    icon: AirplaneIcon,
  },
  completed: {
    bg: 'bg-status-completed-bg',
    border: 'border-status-completed-text/20',
    badgeBg: 'bg-status-completed-text',
    badgeText: 'text-status-completed-bg font-mono text-[9px] tracking-[0.1em]',
    badgeLabel: 'COMPLETED',
    titleColor: 'text-status-completed-text',
    subtitleColor: 'text-status-completed-text/80',
    iconColor: 'text-sage',
    icon: CheckCircleIcon,
  },
};

export default function StatusBanner({
  phase,
  daysUntil,
  currentDay,
  totalDays,
  destination,
}: StatusBannerProps) {
  if (phase === 'planning') return null;

  const cfg = PHASE_CONFIG[phase];
  const Icon = cfg.icon;

  // ── Dynamic copy ────────────────────────────────────────────
  const title = {
    'pre-trip': `Trip starts in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
    active: `Day ${currentDay} of ${totalDays} — Trip in Progress!`,
    completed: `Trip to ${destination} is complete`,
  }[phase];

  const subtitle = {
    'pre-trip': `Get ready for ${destination}! Check your pre-trip checklist in the Overview tab.`,
    active: `You're currently in ${destination}. Check today's activities in the Itinerary tab.`,
    completed: `Hope it was an amazing adventure! Your trip details are preserved below.`,
  }[phase];

  const progressPct = Math.min(100, Math.round((currentDay / Math.max(totalDays, 1)) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`${cfg.bg} border-b ${cfg.border}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className={`flex-shrink-0 ${cfg.iconColor}`}>
            <Icon />
          </div>

          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge */}
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold tracking-wide ${cfg.badgeBg} ${cfg.badgeText}`}>
                {cfg.badgeLabel}
              </span>
              {/* Title */}
              <span className={`text-sm font-semibold ${cfg.titleColor}`}>
                {title}
              </span>
            </div>
            <p className={`text-xs mt-0.5 ${cfg.subtitleColor}`}>
              {subtitle}
            </p>
          </div>

          {/* Right indicator */}
          {phase === 'pre-trip' && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className="text-2xl font-bold text-ink leading-none">
                {daysUntil}
              </div>
              <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-status-planning-text mt-0.5">
                days to go
              </div>
            </div>
          )}

          {phase === 'active' && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className="font-mono text-[9px] tracking-[0.1em] text-ink mb-1">
                {progressPct}% through
              </div>
              <div className="w-28 bg-card-border rounded-full h-[3px] overflow-hidden">
                <motion.div
                  className="bg-marigold h-[3px] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}