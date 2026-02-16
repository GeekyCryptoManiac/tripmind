/**
 * ItineraryTab
 *
 * Main itinerary tab orchestrator showing:
 *   - Day navigation bar (horizontal scrollable)
 *   - Activity timeline for selected day (or empty state)
 *   - Trip notes section with auto-save
 *   - AI generation trigger
 *
 * Week 5 Day 3 changes:
 *   - When phase === 'active', auto-selects currentDay on mount
 *     (and whenever the trip changes) instead of always Day 1.
 *   - Passes todayDay to DayNavigation so it can render the TODAY badge.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Trip } from '../../types';
import type { TripPhase } from '../../utils/tripStatus';
import { getChatService } from '../../services/chatService';
import { apiService } from '../../services/api';
import DayNavigation from './ItineraryTab/DayNavigation';
import ActivityTimeline from './ItineraryTab/ActivityTimeline';
import EmptyDayState from './ItineraryTab/EmptyDayState';

interface ItineraryTabProps {
  trip: Trip;
  notes: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onNotesChange: (value: string) => void;
  onTripUpdate?: (trip: Trip) => void;
  phase: TripPhase;
  currentDay: number;    // which day of the trip is today (1-based), from useTripPhase
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
    // Initialise to today's day if the trip is active, otherwise Day 1
    phase === 'active' ? currentDay : 1
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // ── Derived state ─────────────────────────────────────────
  const itinerary = trip.trip_metadata?.itinerary || [];
  const flights   = trip.trip_metadata?.flights   || [];
  const hotels    = trip.trip_metadata?.hotels    || [];
  const config    = trip.trip_metadata?.itinerary_config;

  const totalDays      = trip.duration_days || 1;
  const daysGenerated  = config?.days_generated || 0;
  const hasAnyItinerary = itinerary.length > 0;
  const daysWithItinerary = itinerary.map((d) => d.day);
  const currentDayData    = itinerary.find((d) => d.day === selectedDay);

  // ── Reset selected day when the trip itself changes ───────
  // If the trip is active, jump to today's day.
  // Otherwise fall back to Day 1.
  useEffect(() => {
    setSelectedDay(phase === 'active' ? currentDay : 1);
  }, [trip.id, phase, currentDay]);

  // ── Handle AI generation ─────────────────────────────────
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
      const pollInterval = 1000;

      const poll = async (): Promise<void> => {
        attempts++;
        const updatedTrip = await apiService.getTrip(trip.id);

        if (updatedTrip.trip_metadata?.itinerary && updatedTrip.trip_metadata.itinerary.length > 0) {
          if (onTripUpdate) onTripUpdate(updatedTrip);
          setIsGenerating(false);
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(() => poll(), pollInterval);
        } else {
          throw new Error(
            'Generation is taking longer than expected (40s). The itinerary may still be processing — try refreshing, or ask in the Chat tab.'
          );
        }
      };

      await poll();
    } catch (err) {
      console.error('Failed to generate itinerary:', err);
      setGenerationError(
        err instanceof Error ? err.message : 'Failed to generate itinerary. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualAdd = () => {
    alert('Manual activity addition coming soon! 🚀');
  };

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* ══════════════════════════════════════════════════════
          DAY NAVIGATION (only when itinerary exists)
          todayDay is passed so DayNavigation can show TODAY badge.
          Only set when the trip is active — no badge in other phases.
          ══════════════════════════════════════════════════════ */}
      {hasAnyItinerary && (
        <DayNavigation
          totalDays={totalDays}
          selectedDay={selectedDay}
          daysWithItinerary={daysWithItinerary}
          onSelectDay={setSelectedDay}
          todayDay={phase === 'active' ? currentDay : undefined}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          LOADING STATE (while generating)
          ══════════════════════════════════════════════════════ */}
      {isGenerating && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            ✨ Generating your itinerary...
          </h3>
          <p className="text-gray-500 text-sm">
            Our AI is crafting the perfect {trip.duration_days}-day plan for {trip.destination}.
            This may take 20–40 seconds.
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ERROR STATE
          ══════════════════════════════════════════════════════ */}
      {generationError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 text-sm">
            <strong>Error:</strong> {generationError}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ITINERARY DISPLAY (timeline or empty state)
          ══════════════════════════════════════════════════════ */}
      {!isGenerating && (
        <AnimatePresence mode="wait">
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
                onManualAdd={handleManualAdd}
              />
            </motion.div>
          )}

          {hasAnyItinerary && (
            <motion.div
              key={`day-${selectedDay}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentDayData ? (
                <ActivityTimeline day={currentDayData} flights={flights} hotels={hotels} />
              ) : (
                <EmptyDayState
                  day={selectedDay}
                  totalDays={totalDays}
                  daysGenerated={daysGenerated}
                  destination={trip.destination}
                  onGenerate={handleGenerate}
                  onManualAdd={handleManualAdd}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ══════════════════════════════════════════════════════
          PARTIAL ITINERARY WARNING
          ══════════════════════════════════════════════════════ */}
      {hasAnyItinerary && config?.is_partial && selectedDay > daysGenerated && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">
                Days {daysGenerated + 1}–{totalDays} not yet generated
              </h4>
              <p className="text-sm text-amber-800">
                Due to MVP token limitations, only the first {daysGenerated} days were generated.
                You can add remaining days manually or ask the AI in the Chat tab:{' '}
                <em>"Generate days {daysGenerated + 1}–{Math.min(daysGenerated + 5, totalDays)}"</em>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          NOTES SECTION
          ══════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">📝 Trip Notes</h4>
          {saveStatus === 'saving' && (
            <span className="text-xs text-gray-400 animate-pulse">Saving...</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 font-medium">✓ Saved</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500">Failed to save</span>
          )}
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Add notes, reminders, or ideas for your trip..."
          className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white resize-none transition-colors"
          rows={4}
        />
      </div>
    </div>
  );
}