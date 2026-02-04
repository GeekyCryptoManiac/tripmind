/**
 * OverviewTab
 * 
 * Overview tab content showing:
 *   - About This Trip description
 *   - Key Details grid (Destination, Duration, Budget, Travelers)
 *   - Travel Dates card
 *   - Travel Alerts placeholder
 *   - AI Recommendations placeholder
 */

import type { Trip } from '../../types';
import { formatDate } from './helpers';

interface OverviewTabProps {
  trip: Trip;
}

export default function OverviewTab({ trip }: OverviewTabProps) {
  return (
    <div className="space-y-5">
      {/* About this trip */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">About This Trip</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {trip.trip_metadata?.description ||
            `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} adventure to ${
              trip.destination
            }. Use the tabs above to plan your itinerary, book travel, or chat with the AI assistant.`}
        </p>
      </div>

      {/* Key Details grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Key Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Destination', value: trip.destination, icon: '🌍' },
            {
              label: 'Duration',
              value: trip.duration_days ? `${trip.duration_days} days` : 'Not set',
              icon: '⏱️',
            },
            {
              label: 'Budget',
              value: trip.budget ? `$${trip.budget.toLocaleString()}` : 'Not set',
              icon: '💰',
            },
            { label: 'Travelers', value: `${trip.travelers_count}`, icon: '👥' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                {icon} {label}
              </p>
              <p className="text-sm font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Travel Dates card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">📆 Travel Dates</h3>
        <div className="flex items-center gap-4 text-sm text-gray-700">
          <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 uppercase mb-1">Departure</p>
            <p className="font-semibold">{formatDate(trip.start_date)}</p>
          </div>
          <span className="text-gray-300 text-lg">→</span>
          <div className="flex-1 bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-400 uppercase mb-1">Return</p>
            <p className="font-semibold">{formatDate(trip.end_date)}</p>
          </div>
        </div>
      </div>

      {/* Travel Alerts — placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">🚨 Travel Alerts & News</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            <strong>Coming Soon</strong> — Real-time travel alerts and advisories for{' '}
            {trip.destination} will appear here.
          </p>
        </div>
      </div>

      {/* AI Recommendations — placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">🤖 AI Recommendations</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800 text-sm">
            <strong>Coming Soon</strong> — Personalized recommendations for {trip.destination}{' '}
            powered by AI will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}