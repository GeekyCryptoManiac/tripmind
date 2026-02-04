/**
 * TripDetailsHero
 * 
 * Hero section with:
 *   - Photo gallery empty state (future: real photos)
 *   - Trip destination title
 *   - Status badge
 *   - Date range display
 *   - Back button
 */

import type { Trip } from '../../types';
import { formatDateShort, getStatusStyles } from './helpers';

interface TripDetailsHeroProps {
  trip: Trip;
  onBack: () => void;
}

export default function TripDetailsHero({ trip, onBack }: TripDetailsHeroProps) {
  const statusStyles = getStatusStyles(trip.status);
  const statusLabel = trip.status.charAt(0).toUpperCase() + trip.status.slice(1);

  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ minHeight: '260px', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
    >
      {/* Empty-state CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          <span className="text-2xl">📷</span>
        </div>
        <p className="text-white text-sm font-medium opacity-80">Add Your Trip Photos</p>
        <button
          className="mt-2 px-4 py-1.5 text-white text-xs font-medium rounded-lg border border-white border-opacity-40 hover:bg-white hover:bg-opacity-10 transition-colors"
          style={{ background: 'rgba(255,255,255,0.15)' }}
        >
          + Upload Photos
        </button>
      </div>

      {/* Bottom overlay — trip name + status + back button */}
      <div
        className="absolute bottom-0 left-0 right-0 px-6 py-5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}
      >
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">{trip.destination}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles.bg} ${statusStyles.text}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusStyles.dot}`} />
                {statusLabel}
              </span>
              <span className="text-white text-sm opacity-80">
                {formatDateShort(trip.start_date)}
                {trip.end_date && ` – ${formatDateShort(trip.end_date)}`}
                {endYear && `, ${endYear}`}
              </span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="text-white text-sm font-medium opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );
}