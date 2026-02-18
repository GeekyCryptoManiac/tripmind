/**
 * EmptyDayState — Redesigned Week 7
 *
 * Visual updates:
 *   - Calendar SVG icon instead of emoji
 *   - Brand blue buttons instead of bright blue
 *   - Amber warning state instead of yellow
 *   - White card with ring border
 *   - Ink color scale for text
 */

interface EmptyDayStateProps {
  day: number;
  totalDays: number;
  daysGenerated: number;
  destination: string;
  onGenerate?: () => void;
  onManualAdd?: () => void;
}

// ── SVG Icons ─────────────────────────────────────────────────
const CalendarIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const SparklesIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);

const PlusIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
  </svg>
);

export default function EmptyDayState({
  day,
  daysGenerated,
  destination,
  onGenerate,
  onManualAdd,
}: EmptyDayStateProps) {
  const isPartial = day > daysGenerated && daysGenerated > 0;

  return (
    <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-8">
      <div className="text-center py-6">
        {/* Icon */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isPartial ? 'bg-amber-100 text-amber-600' : 'bg-brand-100 text-brand-600'
          }`}
        >
          {isPartial ? <AlertIcon /> : <CalendarIcon />}
        </div>

        {/* Title & description */}
        {isPartial ? (
          <>
            <h3 className="text-lg font-semibold text-ink mb-2">
              Day {day} not yet generated
            </h3>
            <p className="text-ink-secondary text-sm max-w-md mx-auto mb-6">
              Due to MVP limitations, only the first {daysGenerated} days were generated. You can
              add remaining days manually or ask the AI assistant to generate more days.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-ink mb-2">No itinerary yet</h3>
            <p className="text-ink-secondary text-sm max-w-md mx-auto mb-6">
              Let AI plan your perfect Day {day} in {destination}
            </p>
          </>
        )}

        {/* Action buttons */}
        <div className="flex justify-center gap-3">
          {isPartial ? (
            <button
              onClick={onManualAdd}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
            >
              <PlusIcon />
              Add Days Manually
            </button>
          ) : (
            <>
              <button
                onClick={onGenerate}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                <SparklesIcon />
                Generate with AI
              </button>
              <button
                onClick={onManualAdd}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-ink rounded-xl text-sm font-semibold ring-1 ring-surface-muted hover:bg-surface-bg transition-colors"
              >
                <PlusIcon />
                Manual Add
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}