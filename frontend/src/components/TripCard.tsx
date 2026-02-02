/**
 * TripCard Component
 * Displays trip information in a beautiful card format
 */

import type { Trip } from '../types';

interface TripCardProps {
  trip: Trip;
}

export default function TripCard({ trip }: TripCardProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatBudget = (budget: number | null) => {
    if (!budget) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(budget);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'planning':
        return 'bg-yellow-100 text-yellow-800';
      case 'booked':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-md w-full">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
        <h3 className="text-2xl font-bold">{trip.destination}</h3>
        <p className="text-blue-100 text-sm mt-1">Trip ID: #{trip.id}</p>
      </div>

      <div className="p-6 space-y-4">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-600">Dates</p>
            <p className="text-gray-800">
              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            </p>
          </div>
        </div>

        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-600">Budget</p>
            <p className="text-gray-800 font-bold">{formatBudget(trip.budget)}</p>
          </div>
        </div>

        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-gray-400 mt-0.5 mr-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-semibold text-gray-600 mb-1">Status</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                trip.status
              )}`}
            >
              {trip.status.toUpperCase()}
            </span>
          </div>
        </div>

        {trip.trip_metadata && Object.keys(trip.trip_metadata).length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm font-semibold text-gray-600 mb-2">Additional Info</p>
            <div className="bg-gray-50 rounded p-3">
              <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(trip.trip_metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Created {new Date(trip.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
