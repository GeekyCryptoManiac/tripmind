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
import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { getChatService } from '../../services/chatService';
import { apiService } from '../../services/api';
import type { ActivityCreateRequest } from '../../services/api';
import DayNavigation from './ItineraryTab/DayNavigation';
import ActivityTimeline from './ItineraryTab/ActivityTimeline';
import EmptyDayState from './ItineraryTab/EmptyDayState';
import AddActivityModal from './ItineraryTab/AddActivityModal';

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
  const [isGenerating, setIsGenerating]     = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Week 8: modal state ───────────────────────────────────
  const [modalOpen, setModalOpen]           = useState(false);
  const [modalTargetDay, setModalTargetDay] = useState(1);

  // ── Derived state ─────────────────────────────────────────
  const itinerary = trip.trip_metadata?.itinerary || [];
  const flights   = trip.trip_metadata?.flights   || [];
  const hotels    = trip.trip_metadata?.hotels    || [];
  const config    = trip.trip_metadata?.itinerary_config;

  const totalDays         = itinerary.length || trip.duration_days || 1;
  const daysGenerated     = config?.days_generated || 0;
  const hasAnyItinerary   = itinerary.length > 0;
  const daysWithItinerary = itinerary.map((d) => d.day);
  const currentDayData    = itinerary.find((d) => d.day === selectedDay);

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
      await chatService.sendMessage({
        user_id: trip.user_id,
        message: 'Generate a detailed itinerary for this trip',
        trip_id: trip.id,
      });

      let attempts = 0;
      const maxAttempts = 40;

      const poll = async (): Promise<void> => {
        attempts++;
        const updatedTrip = await apiService.getTrip(trip.id);

        if ((updatedTrip.trip_metadata?.itinerary?.length ?? 0) > 0) {
          if (onTripUpdate) onTripUpdate(updatedTrip);
          setIsGenerating(false);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(() => poll(), 1000);
        } else {
          throw new Error(
            'Generation is taking longer than expected. The itinerary may still be processing — try refreshing, or ask in the Chat tab.'
          );
        }
      };

      await poll();
    } catch (err) {
      console.error('Failed to generate itinerary:', err);
      setGenerationError(
        err instanceof Error ? err.message : 'Failed to generate itinerary. Please try again.'
      );
      setIsGenerating(false);
    }
  };

  // ── Week 8: open modal for a specific day ─────────────────
  // Called from both EmptyDayState and ActivityTimeline's "+ Add activity" button
  const handleManualAdd = (day?: number) => {
    setModalTargetDay(day ?? selectedDay);
    setModalOpen(true);
  };

  // ── Week 8: submit new activity to backend ────────────────
  const handleAddActivity = async (activityData: ActivityCreateRequest) => {
    const updatedTrip = await apiService.addActivity(trip.id, activityData);
    if (onTripUpdate) onTripUpdate(updatedTrip);
    // Ensure the selected day shows the newly added activity
    setSelectedDay(activityData.day);
  };

  // ── Week 8: delete activity from backend ──────────────────
  const handleDeleteActivity = async (activityId: string) => {
    const updatedTrip = await apiService.deleteActivity(trip.id, activityId);
    if (onTripUpdate) onTripUpdate(updatedTrip);
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Day navigation (only when itinerary exists) ───── */}
      {hasAnyItinerary && (
        <DayNavigation
          totalDays={totalDays}
          selectedDay={selectedDay}
          daysWithItinerary={daysWithItinerary}
          onSelectDay={setSelectedDay}
          todayDay={phase === 'active' ? currentDay : undefined}
        />
      )}

      {/* ── Generating state ──────────────────────────────── */}
      {isGenerating && (
        <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-12 text-center">
          <div className="w-12 h-12 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink mb-2">
            Generating your itinerary...
          </h3>
          <p className="text-ink-secondary text-sm">
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
                daysGenerated={daysGenerated}
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
                  flights={flights}
                  hotels={hotels}
                  onAddActivity={handleManualAdd}
                  onDeleteActivity={handleDeleteActivity}
                />
              ) : (
                <EmptyDayState
                  day={selectedDay}
                  totalDays={totalDays}
                  daysGenerated={daysGenerated}
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
      {hasAnyItinerary && config?.is_partial && selectedDay > daysGenerated && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                Days {daysGenerated + 1}–{totalDays} not yet generated
              </h4>
              <p className="text-sm text-amber-800">
                Only the first {daysGenerated} days were generated. You can add
                activities manually or ask in the Chat tab to generate more days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Notes ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-ink">Trip Notes</h4>
          {saveStatus === 'saving' && (
            <span className="text-xs text-ink-tertiary animate-pulse">Saving...</span>
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
          className="w-full bg-surface-bg border border-surface-muted rounded-xl p-3 text-sm text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent focus:bg-white resize-none transition-colors"
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