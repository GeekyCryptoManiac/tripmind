/**
 * TravelTab
 * 
 * Travel tab content with three sub-tabs:
 *   - Flights
 *   - Hotels
 *   - Transport
 * 
 * Each sub-tab shows an empty state with AI find / manual add CTAs.
 */

import type { Trip } from '../../types';
import type { TravelSubTab } from './helpers';

interface TravelTabProps {
  trip: Trip;
  activeSubTab: TravelSubTab;
  onSubTabChange: (tab: TravelSubTab) => void;
}

export default function TravelTab({
  trip,
  activeSubTab,
  onSubTabChange,
}: TravelTabProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Sub-tab bar */}
      <div className="flex border-b border-gray-200">
        {(
          [
            { key: 'flights', label: 'Flights', emoji: '✈️' },
            { key: 'hotels', label: 'Hotels', emoji: '🏨' },
            { key: 'transport', label: 'Transport', emoji: '🚗' },
          ] as const
        ).map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => onSubTabChange(key)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeSubTab === key
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">
            {activeSubTab === 'flights' ? '✈️' : activeSubTab === 'hotels' ? '🏨' : '🚗'}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No{' '}
          {activeSubTab === 'flights'
            ? 'flights'
            : activeSubTab === 'hotels'
            ? 'hotels'
            : 'transport'}{' '}
          booked yet
        </h3>
        <p className="text-gray-500 text-sm mb-6">
          {activeSubTab === 'flights' &&
            `Find the best flights for your ${trip.destination} trip`}
          {activeSubTab === 'hotels' && `Find accommodation in ${trip.destination}`}
          {activeSubTab === 'transport' && `Plan local transport in ${trip.destination}`}
        </p>
        <div className="flex justify-center gap-3">
          <button className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
            🔍 Find with AI
          </button>
          <button className="px-5 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition-colors">
            + Add Manually
          </button>
        </div>
      </div>
    </div>
  );
}