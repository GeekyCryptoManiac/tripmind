/**
 * tripStatus.ts
 *
 * Core utility for determining a trip's lifecycle phase.
 * Used by StatusBanner, ItineraryTab (today-view), OverviewTab
 * (checklist, live tools), and ExpenseTracker throughout Week 5.
 *
 * All date comparisons happen at UTC midnight to avoid timezone
 * drift — "today" in Singapore is the same "day" here as anywhere.
 *
 * The 4 phases:
 *   planning  — start_date is >7 days away (or dates not set)
 *   pre-trip  — start_date is 1–7 days away
 *   active    — today is between start_date and end_date (inclusive)
 *   completed — end_date has passed
 */

import type { Trip } from '../types';

export type TripPhase = 'planning' | 'pre-trip' | 'active' | 'completed';

// ── Private helpers ───────────────────────────────────────────

/**
 * Parse a YYYY-MM-DD string as UTC midnight.
 * This prevents off-by-one errors caused by local timezone offsets
 * when JS parses "2026-08-01" as midnight UTC vs local time.
 */
function toMidnightUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** Get today's date as UTC midnight (strips the time component). */
function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── Public API ────────────────────────────────────────────────

/**
 * Determine which lifecycle phase a trip is in.
 *
 * If start_date or end_date is missing, returns 'planning' —
 * you can't calculate a phase without both dates.
 *
 * Examples (relative to today):
 *   start=+20d, end=+25d  →  'planning'
 *   start=+3d,  end=+8d   →  'pre-trip'
 *   start=-2d,  end=+3d   →  'active'
 *   start=-10d, end=-5d   →  'completed'
 */
export function getTripPhase(trip: Trip): TripPhase {
  if (!trip.start_date || !trip.end_date) return 'planning';

  const today = todayUTC();
  const start = toMidnightUTC(trip.start_date);
  const end   = toMidnightUTC(trip.end_date);

  // Past the end date → completed
  if (today > end) return 'completed';

  // Between start and end (inclusive) → active
  if (today >= start) return 'active';

  // Before start — check how many days away
  const daysUntil = Math.ceil((start.getTime() - today.getTime()) / MS_PER_DAY);
  return daysUntil <= 7 ? 'pre-trip' : 'planning';
}

/**
 * How many full days until the trip starts.
 *
 * Returns  0   if the trip is active or starting today.
 * Returns -1   if no start_date is set.
 * Returns  N   (positive) for a future trip.
 */
export function getDaysUntilTrip(trip: Trip): number {
  if (!trip.start_date) return -1;

  const today = todayUTC();
  const start = toMidnightUTC(trip.start_date);
  const diff  = Math.ceil((start.getTime() - today.getTime()) / MS_PER_DAY);

  return Math.max(0, diff);
}

/**
 * Which day of the trip is today (1-based).
 *
 * Returns 1              if the trip hasn't started yet.
 * Returns duration_days  if the trip has already ended.
 * Returns 1              if no start_date is set.
 *
 * Example: trip starts Aug 1, today is Aug 3 → returns 3.
 */
export function getCurrentTripDay(trip: Trip): number {
  if (!trip.start_date) return 1;

  const today  = todayUTC();
  const start  = toMidnightUTC(trip.start_date);
  const maxDay = trip.duration_days ?? 1;

  // Math.floor gives us how many complete days have elapsed since start.
  // +1 converts that to a 1-based day number.
  const dayNumber = Math.floor((today.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  // Clamp: can't be before Day 1 or after the last day
  return Math.min(Math.max(1, dayNumber), maxDay);
}

/**
 * Convenience wrapper — call once in a component and destructure
 * all three values. Not a React hook (no useState/useEffect inside),
 * just a named function that returns a plain object.
 *
 * Usage:
 *   const { phase, daysUntil, currentDay } = useTripPhase(trip);
 */
export function useTripPhase(trip: Trip): {
  phase: TripPhase;
  daysUntil: number;
  currentDay: number;
} {
  return {
    phase:      getTripPhase(trip),
    daysUntil:  getDaysUntilTrip(trip),
    currentDay: getCurrentTripDay(trip),
  };
}