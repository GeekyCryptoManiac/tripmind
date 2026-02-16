/**
 * ActivityCard
 * 
 * Individual activity card showing:
 *   - Icon based on activity type
 *   - Time, title, location, description
 *   - Expandable "See more" for long descriptions
 *   - Booking badge if booking_ref exists
 *   - Delete button on hover (disabled for MVP)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Activity } from '../../../types';

interface ActivityCardProps {
  activity: Activity;
  booking?: { status: 'mock' | 'booked' | 'pending'; name?: string };
}

// ── Icon mapping ──────────────────────────────────────────────
const ACTIVITY_ICONS: Record<Activity['type'], string> = {
  activity: '🏛️',
  dining: '🍴',
  flight: '✈️',
  hotel: '🏨',
  transport: '🚗',
};

// ── Booking badge styles ──────────────────────────────────────
const BOOKING_STYLES = {
  mock: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Mock Booking' },
  booked: { bg: 'bg-green-100', text: 'text-green-800', label: '✓ Confirmed' },
  pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
};

export default function ActivityCard({ activity, booking }: ActivityCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const icon = ACTIVITY_ICONS[activity.type];
  const shouldShowExpand = activity.description && activity.description.length > 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      {/* Time badge (top-left corner) */}
      <div className="absolute -left-16 top-4 text-sm font-medium text-gray-500">
        {activity.time}
      </div>

      {/* Icon circle */}
      <div className="absolute -left-5 top-3 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl shadow-md z-10">
        {icon}
      </div>

      {/* Card content */}
      <div className="pl-8">
        {/* Header row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="text-base font-semibold text-gray-900 mb-1">{activity.title}</h4>
            {activity.location && (
              <p className="text-sm text-gray-500 flex items-center gap-1">
                📍 {activity.location}
              </p>
            )}
          </div>

          {/* Delete button (hover only, disabled for MVP) */}
          <AnimatePresence>
            {isHovered && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete activity (coming soon)"
                disabled
              >
                🗑️
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Description */}
        {activity.description && (
          <div className="mb-3">
            <p className="text-sm text-gray-600 leading-relaxed">
              {isExpanded || !shouldShowExpand
                ? activity.description
                : `${activity.description.slice(0, 100)}...`}
            </p>
            {shouldShowExpand && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1"
              >
                {isExpanded ? 'See less ▲' : 'See more ▼'}
              </button>
            )}
          </div>
        )}

        {/* Booking badge */}
        {booking && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`
                inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                ${BOOKING_STYLES[booking.status].bg} ${BOOKING_STYLES[booking.status].text}
              `}
            >
              {BOOKING_STYLES[booking.status].label}
            </span>
            {booking.name && (
              <span className="text-xs text-gray-500">• {booking.name}</span>
            )}
          </div>
        )}

        {/* Notes (if any) */}
        {activity.notes && (
          <div className="mt-3 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <span className="font-semibold">💡 Note:</span> {activity.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}