/**
 * ActivityTimeline
 * 
 * Vertical timeline displaying all activities for a single day
 * Features:
 *   - Blue vertical line connecting activities
 *   - Staggered animation on mount
 *   - Auto-matches booking_ref to flights/hotels
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
  // Helper: Find booking info for an activity
  const findBooking = (bookingRef: string | null | undefined) => {
    if (!bookingRef) return undefined;

    // Check flights
    const flight = flights.find((f) => f.id === bookingRef);
    if (flight) {
      return {
        status: flight.status,
        name: `${flight.airline} ${flight.flight_number}`,
      };
    }

    // Check hotels
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Day header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {day.day}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {day.title || `Day ${day.day}`}
            </h3>
            <p className="text-sm text-gray-500">{day.date}</p>
          </div>
        </div>
      </div>

      {/* Timeline with activities */}
      <div className="relative pl-20">
        {/* Blue vertical line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-blue-500" />

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

      {/* Empty state if no activities */}
      {day.activities.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No activities planned for this day yet</p>
        </div>
      )}
    </div>
  );
}