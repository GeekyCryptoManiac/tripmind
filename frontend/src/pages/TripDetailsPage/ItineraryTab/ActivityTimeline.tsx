/**
 * ActivityTimeline — Redesigned Week 7 + Week 8
 *
 * Week 8:
 *   - Added `onAddActivity` prop — opens AddActivityModal for this day
 *   - Added `onDeleteActivity` prop — threaded down to ActivityCard
 *   - "+ Add activity" button rendered at the bottom of every day's list
 *   - Empty day state within timeline also shows "+ Add activity" button
 */

import { motion } from 'framer-motion';
import ActivityCard from './ActivityCard';
import type { ItineraryDay, Flight, Hotel } from '../../../types';

interface ActivityTimelineProps {
  day: ItineraryDay;
  flights?: Flight[];
  hotels?: Hotel[];
  onAddActivity?: (day: number) => void;           // Week 8: opens modal
  onDeleteActivity?: (activityId: string) => Promise<void>; // Week 8: deletes activity
}

// ── SVG Icons ─────────────────────────────────────────────────
const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

export default function ActivityTimeline({
  day,
  flights = [],
  hotels = [],
  onAddActivity,
  onDeleteActivity,
}: ActivityTimelineProps) {
  const findBooking = (bookingRef: string | null | undefined) => {
    if (!bookingRef) return undefined;

    const flight = flights.find((f) => f.id === bookingRef);
    if (flight) {
      return { status: flight.status, name: `${flight.airline} ${flight.flight_number}` };
    }

    const hotel = hotels.find((h) => h.id === bookingRef);
    if (hotel) {
      return { status: hotel.status, name: hotel.name };
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
      {day.activities.length > 0 ? (
        <div className="relative pl-20">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-brand-200" />

          {/* Activity cards */}
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="show"
            variants={{
              hidden: { opacity: 0 },
              show: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
          >
            {day.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                booking={findBooking(activity.booking_ref)}
                onDelete={onDeleteActivity}
              />
            ))}
          </motion.div>

          {/* "+ Add activity" at the bottom of existing activities */}
          {onAddActivity && (
            <div className="mt-6">
              <button
                onClick={() => onAddActivity(day.day)}
                className="flex items-center gap-2 text-sm font-medium text-ink-tertiary hover:text-brand-600 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-surface-muted group-hover:border-brand-400 flex items-center justify-center transition-colors">
                  <PlusIcon className="w-3.5 h-3.5" />
                </div>
                Add activity
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty day — inline empty state with add button */
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-surface-bg flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-ink-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-ink-tertiary mb-4">No activities planned for this day yet</p>
          {onAddActivity && (
            <button
              onClick={() => onAddActivity(day.day)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors"
            >
              <PlusIcon />
              Add activity
            </button>
          )}
        </div>
      )}
    </div>
  );
}