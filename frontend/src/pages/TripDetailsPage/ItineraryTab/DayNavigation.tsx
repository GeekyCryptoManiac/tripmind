/**
 * DayNavigation
 *
 * Horizontal scrollable day navigation bar.
 * Shows days 1–N with visual indicators:
 *   - Filled dot:   day has itinerary data
 *   - Outline dot:  day is empty
 *   - Blue card:    currently selected day
 *
 * Week 5 Day 3 additions:
 *   - todayDay prop: when provided (phase === 'active'), that day
 *     gets a green TODAY badge below its number and a pulsing
 *     green ring so it's immediately visible in a long list.
 *   - The TODAY day is auto-scrolled into view on mount.
 */

import { useRef, useEffect } from 'react';

interface DayNavigationProps {
  totalDays: number;
  selectedDay: number;
  daysWithItinerary: number[];
  onSelectDay: (day: number) => void;
  /** Which day number is "today". Only set when phase === 'active'. */
  todayDay?: number;
}

export default function DayNavigation({
  totalDays,
  selectedDay,
  daysWithItinerary,
  onSelectDay,
  todayDay,
}: DayNavigationProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the selected day whenever it changes.
  // On first render with an active trip this jumps straight to today.
  useEffect(() => {
    if (scrollContainerRef.current) {
      const target = scrollContainerRef.current.querySelector(
        `[data-day="${selectedDay}"]`
      ) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDay]);

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const isSelected  = day === selectedDay;
          const isToday     = todayDay !== undefined && day === todayDay;
          const hasItinerary = daysWithItinerary.includes(day);

          return (
            <button
              key={day}
              data-day={day}
              onClick={() => onSelectDay(day)}
              className={`
                relative flex-shrink-0 flex flex-col items-center justify-center
                w-16 rounded-lg transition-all duration-200
                ${isToday ? 'pb-4' : 'pb-2'}
                pt-2
                ${
                  isSelected
                    ? 'bg-blue-600 text-white scale-105 shadow-lg'
                    : isToday
                    ? 'bg-green-50 text-green-800 hover:bg-green-100 ring-2 ring-green-400 ring-offset-1'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {/* "Day" label */}
              <span className="text-xs font-medium mb-0.5">Day</span>

              {/* Day number + indicator dot */}
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold">{day}</span>
                <div
                  className={`
                    w-2 h-2 rounded-full transition-all
                    ${
                      hasItinerary
                        ? isSelected
                          ? 'bg-white'
                          : isToday
                          ? 'bg-green-500'
                          : 'bg-blue-600'
                        : isSelected
                        ? 'bg-white/30 border border-white'
                        : 'bg-gray-300 border border-gray-400'
                    }
                  `}
                />
              </div>

              {/* TODAY badge — only shown when this is today's day */}
              {isToday && (
                <span
                  className={`
                    absolute bottom-1
                    text-[10px] font-bold tracking-wider leading-none
                    px-1.5 py-0.5 rounded-full
                    ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-green-500 text-white'
                    }
                  `}
                >
                  TODAY
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}