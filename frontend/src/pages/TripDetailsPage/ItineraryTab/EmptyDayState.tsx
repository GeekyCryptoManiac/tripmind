/**
 * EmptyDayState
 * 
 * Empty state shown when a day has no itinerary
 * Differentiates between:
 *   - No itinerary at all (days 1-5 not generated)
 *   - Partial itinerary (days 6+ when trip >5 days)
 */

interface EmptyDayStateProps {
    day: number;
    totalDays: number;
    daysGenerated: number;
    destination: string;
    onGenerate?: () => void;
    onManualAdd?: () => void;
  }
  
  export default function EmptyDayState({
    day,
    totalDays,
    daysGenerated,
    destination,
    onGenerate,
    onManualAdd,
  }: EmptyDayStateProps) {
    const isPartial = day > daysGenerated && daysGenerated > 0;
  
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
        <div className="text-center py-6">
          {/* Icon */}
          <div
            className={`
              w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4
              ${isPartial ? 'bg-amber-100' : 'bg-blue-100'}
            `}
          >
            <span className="text-3xl">{isPartial ? '⚠️' : '📅'}</span>
          </div>
  
          {/* Title & description */}
          {isPartial ? (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Day {day} not yet generated
              </h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                Due to MVP limitations, only the first {daysGenerated} days were generated. You can
                add remaining days manually or ask the AI assistant to generate more days.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No itinerary yet</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                Let AI plan your perfect Day {day} in {destination}
              </p>
            </>
          )}
  
          {/* Action buttons */}
          <div className="flex justify-center gap-3">
            {isPartial ? (
              <button
                onClick={onManualAdd}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                + Add Days Manually
              </button>
            ) : (
              <>
                <button
                  onClick={onGenerate}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  ✨ Generate with AI
                </button>
                <button
                  onClick={onManualAdd}
                  className="px-5 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  + Manual Add
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }