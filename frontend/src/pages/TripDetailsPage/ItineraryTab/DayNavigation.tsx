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
  dayToCity?: Map<number, string>;
}

export default function DayNavigation({
  totalDays,
  selectedDay,
  daysWithItinerary,
  onSelectDay,
  todayDay,
  dayToCity,
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

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Group consecutive days by city for the city-label headers
  type CityGroup = { city: string; days: number[] };
  const cityGroups: CityGroup[] = [];
  days.forEach((day) => {
    const city = dayToCity?.get(day) ?? '';
    const last = cityGroups[cityGroups.length - 1];
    if (last && last.city === city) {
      last.days.push(day);
    } else {
      cityGroups.push({ city, days: [day] });
    }
  });

  // True when we actually have multiple distinct cities to label
  const hasMultipleCities = cityGroups.filter((g) => g.city).length > 1;

  const renderDayButton = (day: number) => {
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
              ? 'bg-forest text-parchment scale-105 shadow-md'
              : isToday
              ? 'bg-terrain text-forest hover:bg-terrain/70 ring-2 ring-gold ring-offset-1'
              : 'bg-parchment text-sage hover:bg-terrain/30'
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
                    ? 'bg-parchment'
                    : isToday
                    ? 'bg-gold'
                    : 'bg-forest'
                  : isSelected
                  ? 'bg-parchment/30 ring-1 ring-parchment'
                  : 'bg-card-border ring-1 ring-sage'
              }
            `}
          />
        </div>

        {/* TODAY badge */}
        {isToday && (
          <span
            className={`
              absolute bottom-1
              font-mono text-[8px] tracking-[0.12em] leading-none
              px-1.5 py-0.5 rounded-full
              ${
                isSelected
                  ? 'bg-parchment/20 text-parchment'
                  : 'bg-gold text-forest'
              }
            `}
          >
            TODAY
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="bg-parchment border-b border-card-border sticky top-0 z-10">
      <div
        ref={scrollContainerRef}
        className="flex items-start gap-3 px-4 py-3 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hasMultipleCities
          ? cityGroups.map((group, gi) => (
              <div key={gi} className="flex flex-col gap-1 flex-shrink-0">
                {/* Faint city label above this group */}
                <span className="font-mono text-[9px] text-sage tracking-[0.1em] uppercase text-center truncate max-w-[8rem] px-1">
                  {group.city || ' '}
                </span>
                {/* Day buttons row */}
                <div className="flex gap-2">
                  {group.days.map((day) => renderDayButton(day))}
                </div>
              </div>
            ))
          : days.map((day) => (
              <div key={day} className="flex-shrink-0">
                {renderDayButton(day)}
              </div>
            ))}
      </div>
    </div>
  );
}