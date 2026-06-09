/**
 * StatusBanner — Redesigned Week 7
 *
 * Contextual banner between progress bar and tab navigation.
 * Returns null for 'planning' phase.
 *
 * Color palette harmonized with app-wide tokens:
 *   pre-trip  → amber-50 (warm, matches planning status)
 *   active    → emerald-50 (soft, matches booked status)
 *   completed → brand-50 (our blue)
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
    bg: 'bg-[#EEF6F1]',
    border: 'border-[#C8D8C2]/50',
    badgeBg: 'bg-terrain',
    badgeText: 'text-[#3B6150] font-mono text-[9px] tracking-[0.1em]',
    badgeLabel: 'PRE-TRIP',
    titleColor: 'text-[#3B6150]',
    subtitleColor: 'text-[#3B6150]/80',
    iconColor: 'text-gold',
    icon: ClockIcon,
  },
  active: {
    bg: 'bg-[#EEF6F1]',
    border: 'border-[#C8D8C2]/50',
    badgeBg: 'bg-forest',
    badgeText: 'text-[#E8DECE] font-mono text-[9px] tracking-[0.1em]',
    badgeLabel: 'LIVE',
    titleColor: 'text-forest',
    subtitleColor: 'text-forest/70',
    iconColor: 'text-forest',
    icon: AirplaneIcon,
  },
  completed: {
    bg: 'bg-[#EEF6F1]',
    border: 'border-[#C8D8C2]/50',
    badgeBg: 'bg-terrain',
    badgeText: 'text-[#3B6150] font-mono text-[9px] tracking-[0.1em]',
    badgeLabel: 'COMPLETED',
    titleColor: 'text-[#3B6150]',
    subtitleColor: 'text-[#3B6150]/80',
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
              <div className="text-2xl font-bold text-forest leading-none">
                {daysUntil}
              </div>
              <div className="font-mono text-[9px] tracking-[0.1em] uppercase text-[#3B6150] mt-0.5">
                days to go
              </div>
            </div>
          )}

          {phase === 'active' && (
            <div className="flex-shrink-0 text-right hidden sm:block">
              <div className="font-mono text-[9px] tracking-[0.1em] text-[#3B6150] mb-1">
                {progressPct}% through
              </div>
              <div className="w-28 bg-[#DDD8CE] rounded-full h-[3px] overflow-hidden">
                <motion.div
                  className="bg-gold h-[3px] rounded-full"
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