/**
 * Shared types and helper functions for TripDetailsPage components
 */

import type { Trip } from '../../types';

// ── Types ─────────────────────────────────────────────────────
export type TabType = 'overview' | 'itinerary' | 'travel' | 'chat';
export type TravelSubTab = 'flights' | 'hotels' | 'transport';

export interface ProgressTask {
  id: string;
  label: string;
  completed: boolean;
  icon: string;
}

export interface StatusStyles {
  bg: string;
  text: string;
  dot: string;
}

// ── Helper: format dates ──────────────────────────────────────
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Helper: status badge styles ───────────────────────────────
export function getStatusStyles(status: string): StatusStyles {
  switch (status) {
    case 'planning':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' };
    case 'booked':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' };
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
  }
}

// ── Helper: compute progress checklist from trip fields ───────
export function getProgressTasks(trip: Trip): ProgressTask[] {
  return [
    { id: 'destination', label: 'Set Destination',   completed: !!trip.destination,                        icon: '🌍' },
    { id: 'dates',       label: 'Set Travel Dates',  completed: !!(trip.start_date && trip.end_date),      icon: '📅' },
    { id: 'budget',      label: 'Set Budget',        completed: !!trip.budget,                             icon: '💰' },
    { id: 'travelers',   label: 'Add Travelers',     completed: trip.travelers_count > 0,                  icon: '👥' },
    { id: 'itinerary',   label: 'Plan Itinerary',    completed: !!trip.trip_metadata?.itinerary,           icon: '📋' },
    { id: 'flights',     label: 'Book Flights',      completed: !!trip.trip_metadata?.flights,             icon: '✈️' },
    { id: 'hotels',      label: 'Book Hotels',       completed: !!trip.trip_metadata?.hotels,              icon: '🏨' },
    { id: 'notes',       label: 'Add Notes',         completed: !!trip.trip_metadata?.notes,               icon: '📝' },
  ];
}