/**
 * ActivityTimeline — Redesigned Week 7
 *
 * Visual updates:
 *   - Brand blue circle and timeline instead of bright blue
 *   - White card with ring border
 *   - Ink color scale for text
 *   - Surface-bg for empty state
 */

import { motion } from 'framer-motion';
import ActivityCard from './ActivityCard';
import type { ItineraryDay, Flight, Hotel } from '../../../types';

interface ActivityTimelineProps {
  day: ItineraryDay;
  flights?: Flight[];
  hotels?: Hotel[];
}

export default function ActivityTimeline({ day, flights = [], hotels = [] }: ActivityTimelineProps) {
  const findBooking = (bookingRef: string | null | undefined) => {
    if (!bookingRef) return undefined;

    const flight = flights.find((f) => f.id === bookingRef);
    if (flight) {
      return {
        status: flight.status,
        name: `${flight.airline} ${flight.flight_number}`,
      };
    }

    const hotel = hotels.find((h) => h.id === bookingRef);
    if (hotel) {
      return {
        status: hotel.status,
        name: hotel.name,
      };
    }

    return undefined;
  };

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
      {/* Day header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-brand-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {day.day}
          </div>
          <div>
            <h3 className="text-lg font-bold text-ink">
              {day.title || `Day ${day.day}`}
            </h3>
            <p className="text-sm text-ink-secondary">{day.date}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-20">
        {/* Brand blue vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-brand-500" />

        {/* Activities */}
        <motion.div
          className="space-y-6"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          {day.activities.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              booking={findBooking(activity.booking_ref)}
            />
          ))}
        </motion.div>
      </div>

      {/* Empty state */}
      {day.activities.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-surface-bg flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-ink-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-ink-tertiary">No activities planned for this day yet</p>
        </div>
      )}
    </div>
  );
}