/**
 * ItineraryTab
 * 
 * Itinerary tab content showing:
 *   - Empty state with AI generation / manual add CTAs
 *   - Trip notes textarea with auto-save status indicator
 */

import type { Trip } from '../../types';

interface ItineraryTabProps {
  trip: Trip;
  notes: string;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  onNotesChange: (value: string) => void;
}

export default function ItineraryTab({
  trip,
  notes,
  saveStatus,
  onNotesChange,
}: ItineraryTabProps) {
  return (
    <div className="space-y-5">
      {/* Empty state */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📅</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No itinerary yet</h3>
          <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
            Let AI plan your perfect
            {trip.duration_days ? ` ${trip.duration_days}-day` : ''}{' '}
            {trip.destination.toLowerCase()} adventure
          </p>
          <div className="flex justify-center gap-3">
            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
              ✨ Generate with AI
            </button>
            <button className="px-5 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition-colors">
              + Manual Add
            </button>
          </div>
        </div>
      </div>

      {/* Notes section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">📝 Trip Notes</h4>
          {/* Auto-save status */}
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