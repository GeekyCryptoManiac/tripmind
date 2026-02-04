/**
 * TripSummaryCard
 * 
 * Sticky right-side summary card showing:
 *   - Status badge
 *   - Travel dates
 *   - Budget (total + per person)
 *   - Travelers count
 *   - Destination
 *   - Mini progress bar
 *   - Quick action buttons (Chat, Plan Itinerary)
 */

import type { Trip } from '../../types';
import type { StatusStyles } from './helpers';
import { formatDateShort } from './helpers';

interface TripSummaryCardProps {
  trip: Trip;
  progressPct: number;
  progressColor: string;
  statusStyles: StatusStyles;
  statusLabel: string;
  endYear: number | null;
  onChatClick: () => void;
  onItineraryClick: () => void;
}

export default function TripSummaryCard({
  trip,
  progressPct,
  progressColor,
  statusStyles,
  statusLabel,
  endYear,
  onChatClick,
  onItineraryClick,
}: TripSummaryCardProps) {
  return (
    <div className="lg:w-80 xl:w-96 shrink-0">
      <div className="lg:sticky lg:top-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
          Trip Summary
        </h3>

        {/* Status badge */}
        <div className="mb-5">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyles.bg} ${statusStyles.text}`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${statusStyles.dot}`} />
            {statusLabel}
          </span>
        </div>

        {/* Detail rows */}
        <div className="space-y-4">
          {/* Dates */}
          <div className="flex items-start gap-3">
            <span className="text-lg">📅</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {formatDateShort(trip.start_date)}
                {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
                {endYear && `, ${endYear}`}
              </p>
              <p className="text-xs text-gray-400">
                {trip.duration_days ? `${trip.duration_days} days` : 'Duration not set'}
              </p>
            </div>
          </div>

          {/* Budget */}
          <div className="flex items-start gap-3">
            <span className="text-lg">💰</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {trip.budget ? `$${trip.budget.toLocaleString()}` : 'No budget set'}
              </p>
              <p className="text-xs text-gray-400">Total budget</p>
            </div>
          </div>

          {/* Travelers */}
          <div className="flex items-start gap-3">
            <span className="text-lg">👥</span>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {trip.travelers_count} {trip.travelers_count === 1 ? 'traveler' : 'travelers'}
              </p>
              <p className="text-xs text-gray-400">
                {trip.budget && trip.travelers_count
                  ? `$${Math.round(trip.budget / trip.travelers_count).toLocaleString()} per person`
                  : 'Budget per person'}
              </p>
            </div>
          </div>

          {/* Destination */}
          <div className="flex items-start gap-3">
            <span className="text-lg">🌍</span>
            <div>
              <p className="text-sm font-medium text-gray-900">{trip.destination}</p>
              <p className="text-xs text-gray-400">Destination</p>
            </div>
          </div>
        </div>

        {/* Mini progress bar */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <div className="flex justify-between items-center mb-2">
            <p className="text-xs font-medium text-gray-500">Trip Completion</p>
            <p className="text-xs font-bold text-gray-700">{progressPct}%</p>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: progressColor }}
            />
          </div>
        </div>

        {/* Quick-action buttons */}
        <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col gap-2">
          <button
            onClick={onChatClick}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            💬 Chat About This Trip
          </button>
          <button
            onClick={onItineraryClick}
            className="w-full px-4 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            📋 Plan Itinerary
          </button>
        </div>
      </div>
    </div>
  );
}