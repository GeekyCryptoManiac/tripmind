/**
 * ActivityCard — Redesigned Week 7
 *
 * Visual updates:
 *   - All emojis replaced with SVG icons
 *   - Brand blue circle instead of bright blue
 *   - Warm amber for note boxes instead of bright blue
 *   - Surface-bg for hover states
 *   - Ink color scale for text
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity } from '../../../types';

interface ActivityCardProps {
  activity: Activity;
  booking?: { status: 'mock' | 'booked' | 'pending'; name?: string };
}

// ── SVG Icons ─────────────────────────────────────────────────
const ActivityIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const DiningIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const FlightIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const HotelIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
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

const MapPinIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const LightbulbIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

// Icon mapping
const ACTIVITY_ICONS: Record<Activity['type'], React.ComponentType<{ className?: string }>> = {
  activity: ActivityIcon,
  dining: DiningIcon,
  flight: FlightIcon,
  hotel: HotelIcon,
  transport: TransportIcon,
};

// Booking badge styles
const BOOKING_STYLES = {
  mock: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Mock Booking' },
  booked: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '✓ Confirmed' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Pending' },
};

export default function ActivityCard({ activity, booking }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const Icon = ACTIVITY_ICONS[activity.type];
  const shouldShowExpand = activity.description && activity.description.length > 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white rounded-xl ring-1 ring-black/[0.03] p-4 hover:shadow-md transition-shadow"
    >
      {/* Time badge */}
      <div className="absolute -left-16 top-4 text-sm font-medium text-ink-tertiary">
        {activity.time}
      </div>

      {/* Icon circle */}
      <div className="absolute -left-5 top-3 w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white shadow-md z-10">
        <Icon className="w-5 h-5" />
      </div>

      {/* Card content */}
      <div className="pl-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="text-base font-semibold text-ink mb-1">{activity.title}</h4>
            {activity.location && (
              <p className="text-sm text-ink-secondary flex items-center gap-1">
                <MapPinIcon />
                {activity.location}
              </p>
            )}
          </div>

          {/* Delete button */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="ml-3 p-1.5 text-ink-tertiary hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                title="Delete activity (coming soon)"
                disabled
              >
                <TrashIcon />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Description */}
        {activity.description && (
          <div className="mb-3">
            <p className="text-sm text-ink-secondary leading-relaxed">
              {isExpanded || !shouldShowExpand
                ? activity.description
                : `${activity.description.slice(0, 100)}...`}
            </p>
            {shouldShowExpand && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-brand-600 hover:text-brand-700 font-medium mt-1"
              >
                {isExpanded ? 'See less ▲' : 'See more ▼'}
              </button>
            )}
          </div>
        )}

        {/* Booking badge */}
        {booking && (
          <div className="flex items-center gap-2 mt-2">
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${BOOKING_STYLES[booking.status].bg} ${BOOKING_STYLES[booking.status].text}`}>
              {BOOKING_STYLES[booking.status].label}
            </span>
            {booking.name && (
              <span className="text-xs text-ink-tertiary">• {booking.name}</span>
            )}
          </div>
        )}

        {/* Notes */}
        {activity.notes && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-800 flex items-start gap-1.5">
              <LightbulbIcon className="flex-shrink-0 mt-0.5" />
              <span><span className="font-semibold">Note:</span> {activity.notes}</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}