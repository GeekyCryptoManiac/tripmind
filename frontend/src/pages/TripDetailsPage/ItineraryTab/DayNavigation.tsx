/**
 * DayNavigation — Redesigned Week 7
 *
 * Horizontal scrollable day navigation bar.
 * 
 * Visual updates:
 *   - Brand blue for selected day instead of bright blue
 *   - Emerald for TODAY indicator instead of bright green
 *   - Surface-bg for unselected days
 *   - Warm border instead of gray
 */

import { useRef, useEffect } from 'react';

interface DayNavigationProps {
  totalDays: number;
  selectedDay: number;
  daysWithItinerary: number[];
  onSelectDay: (day: number) => void;
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
    <div className="bg-white border-b border-surface-muted sticky top-0 z-10">
      <div
        ref={scrollContainerRef}
        className="flex gap-2 px-4 py-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
          const isSelected = day === selectedDay;
          const isToday = todayDay !== undefined && day === todayDay;
          const hasItinerary = daysWithItinerary.includes(day);

          return (
            <button
              key={day}
              data-day={day}
              onClick={() => onSelectDay(day)}
              className={`
                relative flex-shrink-0 flex flex-col items-center justify-center
                w-16 rounded-xl transition-all duration-200
                ${isToday ? 'pb-4' : 'pb-2'}
                pt-2
                ${
                  isSelected
                    ? 'bg-brand-600 text-white scale-105 shadow-md'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ring-2 ring-emerald-400 ring-offset-1'
                    : 'bg-surface-bg text-ink-secondary hover:bg-surface-muted'
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
                          ? 'bg-emerald-500'
                          : 'bg-brand-600'
                        : isSelected
                        ? 'bg-white/30 ring-1 ring-white'
                        : 'bg-surface-muted ring-1 ring-ink-tertiary'
                    }
                  `}
                />
              </div>

              {/* TODAY badge */}
              {isToday && (
                <span
                  className={`
                    absolute bottom-1
                    text-[10px] font-bold tracking-wider leading-none
                    px-1.5 py-0.5 rounded-full
                    ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-500 text-white'
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