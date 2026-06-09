/**
 * ItineraryTab
 *
 * Main itinerary tab orchestrator showing:
 *   - Day navigation bar (horizontal scrollable)
 *   - Activity timeline for selected day (or empty state)
 *   - Trip notes section with auto-save
 *   - AI generation trigger
 *
 * Week 5 Day 3:
 *   - When phase === 'active', auto-selects currentDay on mount
 *
 * Week 8 Bug Fix:
 *   - Fixed: totalDays now uses itinerary.length first, then duration_days
 *
 * Week 8 Feature — Manual activity management:
 *   - handleManualAdd: opens AddActivityModal (replaces the alert)
 *   - handleAddActivity: calls apiService.addActivity, updates local trip state
 *   - handleDeleteActivity: calls apiService.deleteActivity, updates local trip state
 *   - AddActivityModal threaded in at the bottom of the component
 *   - onAddActivity + onDeleteActivity props passed to ActivityTimeline
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trip, ActivityCreateRequest } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { getChatService } from '../../services/chatService';
import { apiService } from '../../services/api';
import DayNavigation from './ItineraryTab/DayNavigation';
import ActivityTimeline from './ItineraryTab/ActivityTimeline';
import EmptyDayState from './ItineraryTab/EmptyDayState';
import AddActivityModal from './ItineraryTab/AddActivityModal';
import { groupActivitiesByDay } from '../../types';
import type { Waypoint } from '../../types';

// ── City-grouping helper ──────────────────────────────────────
// Maps each 1-based day number → city name, using waypoint arrival dates.
// Returns an empty map when dates are missing or the trip is single-city.
function buildDayToCityMap(
  waypoints: Waypoint[],
  startDate: string | null,
  totalDays: number,
): Map<number, string> {
  const map = new Map<number, string>();
  if (!startDate || waypoints.length <= 2) return map;

  const tripStart = new Date(startDate).getTime();
  const sorted = [...waypoints].sort((a, b) => a.order_index - b.order_index);
  const origin      = sorted[0];
  const destination = sorted[sorted.length - 1];

  // Only intermediate stops that have arrival dates
  const dated = sorted.slice(1, -1).filter((wp) => wp.arrival_date);
  if (dated.length === 0) return map;

  // Days before the first intermediate arrives → origin city
  const firstArrDay =
    Math.round((new Date(dated[0].arrival_date!).getTime() - tripStart) / 86_400_000) + 1;
  for (let d = 1; d < firstArrDay; d++) map.set(d, origin.city);

  // Each intermediate stop: arrival through departure (exclusive)
  dated.forEach((wp, i) => {
    const arrDay =
      Math.round((new Date(wp.arrival_date!).getTime() - tripStart) / 86_400_000) + 1;
    const nextArrDay =
      i < dated.length - 1 && dated[i + 1].arrival_date
        ? Math.round((new Date(dated[i + 1].arrival_date!).getTime() - tripStart) / 86_400_000) + 1
        : totalDays + 1;
    const endDay = wp.departure_date
      ? Math.round((new Date(wp.departure_date).getTime() - tripStart) / 86_400_000) + 1
      : nextArrDay;
    for (let d = Math.max(1, arrDay); d < Math.min(endDay, totalDays + 1); d++) {
      map.set(d, wp.city);
    }
  });

  // Days from last intermediate's departure onward → destination city
  const lastStop = dated[dated.length - 1];
  if (lastStop.departure_date) {
    const destStartDay =
      Math.round((new Date(lastStop.departure_date).getTime() - tripStart) / 86_400_000) + 1;
    for (let d = destStartDay; d <= totalDays; d++) map.set(d, destination.city);
  }

  return map;
}

interface ItineraryTabProps {
  trip: Trip;
  notes: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onNotesChange: (value: string) => void;
  onTripUpdate?: (trip: Trip) => void;
  phase: TripPhase;
  currentDay: number;
}

export default function ItineraryTab({
  trip,
  notes,
  saveStatus,
  onNotesChange,
  onTripUpdate,
  phase,
  currentDay,
}: ItineraryTabProps) {
  const [selectedDay, setSelectedDay] = useState(() =>
    phase === 'active' ? currentDay : 1
  );
  const [isGenerating, setIsGenerating]       = useState(false);
  const [isRegenerating, setIsRegenerating]   = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Week 8: modal state ───────────────────────────────────
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalTargetDay, setModalTargetDay] = useState(1);

  // ── Derived state ─────────────────────────────────────────
const itinerary = groupActivitiesByDay(trip.activities);
const flights   = trip.saved_travel.filter(t => t.type === 'flight');
const hotels    = trip.saved_travel.filter(t => t.type === 'hotel');

const totalDays         = trip.duration_days || itinerary.length || 1;
const hasAnyItinerary   = itinerary.length > 0;
const daysWithItinerary = itinerary.map((d) => d.day);
const currentDayData    = itinerary.find((d) => d.day === selectedDay);
const dayToCity         = buildDayToCityMap(trip.waypoints, trip.start_date, totalDays);

  // ── Reset selected day when trip changes ──────────────────
  useEffect(() => {
    setSelectedDay(phase === 'active' ? currentDay : 1);
  }, [trip.id, phase, currentDay]);

  // ── AI generation ─────────────────────────────────────────
  const handleGenerate = async () => {
  setIsGenerating(true);
  setGenerationError(null);

  try {
    const chatService = getChatService('trip');

    const sortedWaypoints = [...trip.waypoints].sort((a, b) => a.order_index - b.order_index);
    const isMultiCity = sortedWaypoints.length > 2;
    const daysStr = trip.duration_days ? `${trip.duration_days}-day ` : '';

    // For multi-city trips, require dates on all intermediate stops so we can
    // assign precise day ranges per city in the prompt
    let message: string;
    if (isMultiCity) {
      const intermediate = sortedWaypoints.slice(1, -1);
      const missingDates = intermediate.filter(wp => !wp.arrival_date || !wp.departure_date);

      if (missingDates.length > 0) {
        setGenerationError(
          `Add arrival and departure dates to all stops before generating: ${missingDates.map(w => w.city).join(', ')}.`
        );
        setIsGenerating(false);
        return;
      }

      // Compute explicit city day ranges from waypoint dates
      const tripStart = new Date(trip.start_date!).getTime();
      const origin = sortedWaypoints[0];
      const destination = sortedWaypoints[sortedWaypoints.length - 1];
      const cityRanges: string[] = [];

      const firstArrDay = Math.round((new Date(intermediate[0].arrival_date!).getTime() - tripStart) / 86_400_000) + 1;
      cityRanges.push(firstArrDay > 1
        ? `Days 1–${firstArrDay - 1}: ${origin.city}`
        : `Day 1: ${origin.city} (transit/departure day)`);

      intermediate.forEach((wp) => {
        const arrDay = Math.round((new Date(wp.arrival_date!).getTime() - tripStart) / 86_400_000) + 1;
        const depDay = Math.round((new Date(wp.departure_date!).getTime() - tripStart) / 86_400_000) + 1;
        cityRanges.push(arrDay === depDay ? `Day ${arrDay}: ${wp.city}` : `Days ${arrDay}–${depDay}: ${wp.city}`);
      });

      const lastDepDay = Math.round((new Date(intermediate[intermediate.length - 1].departure_date!).getTime() - tripStart) / 86_400_000) + 1;
      cityRanges.push(`Days ${lastDepDay}–${totalDays}: ${destination.city}`);

      message = `Generate a detailed day-by-day itinerary for this ${daysStr}trip. Assign activities to exactly these city day ranges:\n${cityRanges.map(r => `- ${r}`).join('\n')}\nGenerate activities only within each city's assigned days. Do not mix cities across days.`;
    } else {
      message = `Generate a detailed itinerary for this ${daysStr}trip to ${trip.destination}.`;
    }

    const response = await chatService.sendMessage({
      user_id: trip.user_id,
      message,
      trip_id: trip.id,
    });

    // trip_data is already populated by the time chat responds —
    // the agent awaits tool completion before returning
    if (response.trip_data && response.trip_data.activities?.length > 0) {
      if (onTripUpdate) onTripUpdate(response.trip_data);
    } else {
      // Fallback — fetch once in case trip_data wasn't populated
      const updatedTrip = await apiService.getTrip(trip.id);
      if (updatedTrip.activities?.length > 0) {
        if (onTripUpdate) onTripUpdate(updatedTrip);
      } else {
        setGenerationError(
          'Itinerary generation failed. Please try again or add activities manually.'
        );
      }
    }
  } catch (err) {
    console.error('Failed to generate itinerary:', err);
    setGenerationError(
      err instanceof Error ? err.message : 'Failed to generate itinerary. Please try again.'
    );
  } finally {
    setIsGenerating(false);
  }
};

  // ── Regenerate: clear all activities then re-generate ─────
  const handleRegenerate = async () => {
    if (!window.confirm('This will delete all existing activities and regenerate the itinerary. Continue?')) return;
    setIsRegenerating(true);
    setGenerationError(null);
    try {
      await apiService.clearAllActivities(trip.id);
      // Optimistically clear local state so handleGenerate sees an empty trip
      if (onTripUpdate) onTripUpdate({ ...trip, activities: [] });
    } catch (err) {
      setGenerationError('Failed to clear existing itinerary. Please try again.');
      setIsRegenerating(false);
      return;
    }
    setIsRegenerating(false);
    await handleGenerate();
  };

  // ── Week 8: open modal for a specific day ─────────────────
  // Called from both EmptyDayState and ActivityTimeline's "+ Add activity" button
  const handleManualAdd = (day?: number) => {
    setModalTargetDay(day ?? selectedDay);
    setModalOpen(true);
  };

  // ── Week 8: submit new activity to backend ────────────────
const handleAddActivity = async (activityData: ActivityCreateRequest) => {
  await apiService.addActivity(trip.id, activityData);
  const updatedTrip = await apiService.getTrip(trip.id);
  if (onTripUpdate) onTripUpdate(updatedTrip);
  setSelectedDay(activityData.day);
};

  // ── Week 8: delete activity from backend ──────────────────
const handleDeleteActivity = async (activityId: number) => {
  await apiService.deleteActivity(trip.id, activityId);
  const updatedTrip = await apiService.getTrip(trip.id);
  if (onTripUpdate) onTripUpdate(updatedTrip);
};
  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Day navigation + Regenerate (only when itinerary exists) */}
      {hasAnyItinerary && (
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <DayNavigation
              totalDays={totalDays}
              selectedDay={selectedDay}
              daysWithItinerary={daysWithItinerary}
              onSelectDay={setSelectedDay}
              todayDay={phase === 'active' ? currentDay : undefined}
              dayToCity={dayToCity}
            />
          </div>
          <button
            onClick={handleRegenerate}
            disabled={isGenerating || isRegenerating}
            title="Clear all activities and regenerate the itinerary"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.08em] text-sage bg-parchment border border-card-border rounded-xl hover:bg-terrain/20 hover:text-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRegenerating ? (
              <div className="w-3.5 h-3.5 border-2 border-ink-tertiary border-t-ink rounded-full animate-spin" />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Regenerate
          </button>
        </div>
      )}

      {/* ── Generating state ──────────────────────────────── */}
      {isGenerating && (
        <div className="bg-parchment rounded-2xl border border-card-border shadow-sm p-12 text-center">
          <div className="w-12 h-12 border-2 border-terrain border-t-forest rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-forest mb-2">
            Generating your itinerary...
          </h3>
          <p className="text-sage text-sm">
            Crafting the perfect {trip.duration_days}-day plan for {trip.destination}.
            This may take 20–40 seconds.
          </p>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────── */}
      {generationError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-amber-800 text-sm">
            <strong>Error:</strong> {generationError}
          </p>
        </div>
      )}

      {/* ── Timeline or empty state ───────────────────────── */}
      {!isGenerating && (
        <AnimatePresence mode="wait">

          {/* No itinerary at all */}
          {!hasAnyItinerary && (
            <motion.div
              key="no-itinerary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyDayState
                day={1}
                totalDays={totalDays}
                daysGenerated={itinerary.length}
                destination={trip.destination}
                onGenerate={handleGenerate}
                onManualAdd={() => handleManualAdd(1)}
              />
            </motion.div>
          )}

          {/* Itinerary exists — show timeline or per-day empty state */}
          {hasAnyItinerary && (
            <motion.div
              key={`day-${selectedDay}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentDayData ? (
                <ActivityTimeline
                  day={currentDayData}
                  tripStartDate={trip.start_date}
                  cityName={dayToCity.get(selectedDay)}
                  flights={flights}
                  hotels={hotels}
                  onAddActivity={handleManualAdd}
                  onDeleteActivity={handleDeleteActivity}
                />
              ) : (
                <EmptyDayState
                  day={selectedDay}
                  totalDays={totalDays}
                  daysGenerated={itinerary.length}
                  destination={trip.destination}
                  onGenerate={handleGenerate}
                  onManualAdd={() => handleManualAdd(selectedDay)}
                />
              )}
            </motion.div>
          )}

        </AnimatePresence>
      )}

      {/* ── Partial itinerary warning ─────────────────────── */}
      {hasAnyItinerary && itinerary.length < totalDays && selectedDay > itinerary.length && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                Days {itinerary.length + 1}–{totalDays} not yet generated
              </h4>
              <p className="text-sm text-amber-800">
                Only the first {itinerary.length} days have activities. You can add
                activities manually or ask in the Chat tab to generate more days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes ─────────────────────────────────────────── */}
      <div className="bg-parchment rounded-2xl border border-card-border shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-mono text-[11px] tracking-[0.1em] uppercase text-sage">Trip Notes</h4>
          {saveStatus === 'saving' && (
            <span className="text-xs text-sage animate-pulse">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-emerald-600 font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Failed to save</span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add notes, reminders, or ideas for your trip..."
          className="w-full bg-terrain/20 border border-card-border rounded-xl p-3 text-sm text-ink placeholder-sage focus:outline-none focus:ring-2 focus:ring-forest focus:border-transparent focus:bg-parchment resize-none transition-colors"
          rows={4}
        />
      </div>

      {/* ── Add Activity Modal ────────────────────────────── */}
      <AddActivityModal
        isOpen={modalOpen}
        day={modalTargetDay}
        tripDestination={trip.destination}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddActivity}
      />

    </div>
  );
}