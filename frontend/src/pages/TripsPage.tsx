import { useState, useEffect } from 'react';
import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiService } from '../services/api';
import type { Trip } from '../types';
import WorldMap from '../components/WorldMap';
import MapLegend from '../components/MapLegend';
import { AnimatePresence, motion } from 'framer-motion';
// ── Shared helper ─────────────────────────────────────────────
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'planning':  return 'bg-red-100 text-red-800';
    case 'booked':    return 'bg-amber-100 text-amber-800';
    case 'completed': return 'bg-green-100 text-green-800';
    default:          return 'bg-gray-100 text-gray-800';
  }
}

// ── Trip selection modal (multiple trips on one country) ──────
interface TripSelectModalProps {
  trips: Trip[];
  countryName: string;
  onSelect: (trip: Trip) => void;
  onClose: () => void;
}

const TripSelectModal: FC<TripSelectModalProps> = ({ trips, countryName, onSelect, onClose }) => (
    <motion.div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      {/* Backdrop — separate from the card so only the card gets the scale animation */}
      <div className="absolute inset-0 bg-black/50" />
  
      {/* Card — scales + slides up with a springy overshoot */}
      <motion.div
        className="relative z-10 bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        initial={{ scale: 0.92, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 16, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Trips in {countryName}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {trips.length} trips — pick one to view
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none -mt-1"
          >
            ×
          </button>
        </div>
  
        {/* Trip list — unchanged from before */}
        <div className="px-6 pb-6 space-y-2.5">
          {trips.map((trip) => (
            <button
              key={trip.id}
              onClick={() => onSelect(trip)}
              className="w-full text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg p-4 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                  {trip.destination}
                </p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
                  {trip.status}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
                {trip.start_date && <span>📅 {formatDate(trip.start_date)}</span>}
                {trip.budget        && <span>💰 ${trip.budget.toLocaleString()}</span>}
                {trip.travelers_count > 0 && <span>👥 {trip.travelers_count}</span>}
              </div>
              <p className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                View trip details →
              </p>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );

// ── Main page ─────────────────────────────────────────────────
const TripsPage: FC = () => {
  const { userId } = useUser();
  const navigate = useNavigate();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Modal state: null = closed, { trips, countryName } = open
  const [modalData, setModalData] = useState<{ trips: Trip[]; countryName: string } | null>(null);

  useEffect(() => {
    const fetchTrips = async () => {
      if (!userId) return;
      try {
        setIsLoading(true);
        setError(null);
        const fetchedTrips = await apiService.getUserTrips(userId);
        setTrips(fetchedTrips);
      } catch (err) {
        console.error('Failed to fetch trips:', err);
        setError('Failed to load trips. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTrips();
  }, [userId]);

  // Trip counts for the stats panel
  const tripCounts = {
    planning:  trips.filter((t) => t.status === 'planning').length,
    booked:    trips.filter((t) => t.status === 'booked').length,
    completed: trips.filter((t) => t.status === 'completed').length,
  };

  // ── Map click handler ───────────────────────────────────────
  // WorldMap passes us the trips array + geo country name directly.
  // 1 trip  → go straight to details.
  // 2+ trips → open the selection modal.
  const handleCountryClick = (countryTrips: Trip[], countryName: string) => {
    if (countryTrips.length === 1) {
      navigate(`/trips/${countryTrips[0].id}`);
    } else if (countryTrips.length > 1) {
      setModalData({ trips: countryTrips, countryName });
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading your trips...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  // ── Empty ───────────────────────────────────────────────────
  if (trips.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Trips</h1>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h2>
          <p className="text-gray-600 mb-6">Start planning your next adventure!</p>
          <button
            onClick={() => navigate('/chat')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Plan a Trip
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Trips</h1>
          <p className="text-gray-600">
            {trips.length} {trips.length === 1 ? 'trip' : 'trips'} • {tripCounts.planning} planning • {tripCounts.booked} booked • {tripCounts.completed} completed
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🗺️ Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📋 List
            </button>
          </div>

          <button
            onClick={() => navigate('/chat')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Plan New Trip
          </button>
        </div>
      </div>

      {/* ── Map view ──────────────────────────────────────────── */}
      {viewMode === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Trips</p>
                  <p className="text-3xl font-bold text-gray-900">{trips.length}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600">Planning</p>
                    <p className="text-xl font-semibold text-red-600">{tripCounts.planning}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Booked</p>
                    <p className="text-xl font-semibold text-amber-600">{tripCounts.booked}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Done</p>
                    <p className="text-xl font-semibold text-green-600">{tripCounts.completed}</p>
                  </div>
                </div>
              </div>
            </div>
            <MapLegend
              planningCount={tripCounts.planning}
              bookedCount={tripCounts.booked}
              completedCount={tripCounts.completed}
            />
          </div>

          {/* Map */}
          <div className="lg:col-span-3">
            <WorldMap trips={trips} onCountryClick={handleCountryClick} />
          </div>
        </div>
      )}

      {/* ── List view ─────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onClick={() => navigate(`/trips/${trip.id}`)} />
          ))}
        </div>
      )}

      {/* ── Selection modal (multiple trips on one country) ──── */}
      <AnimatePresence>
        {modalData && (
            <TripSelectModal
            trips={modalData.trips}
            countryName={modalData.countryName}
            onSelect={(trip) => {
                setModalData(null);
                navigate(`/trips/${trip.id}`);
            }}
            onClose={() => setModalData(null)}
            />
        )}
      </AnimatePresence>
      
    </div>
  );
};

// ── Trip card (list view) ─────────────────────────────────────
const TripCard: FC<{ trip: Trip; onClick: () => void }> = ({ trip, onClick }) => (
  <div
    onClick={onClick}
    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
  >
    <div className="flex items-start justify-between mb-4">
      <h3 className="text-xl font-semibold text-gray-900">{trip.destination}</h3>
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(trip.status)}`}>
        {trip.status}
      </span>
    </div>

    <div className="space-y-2">
      <div className="flex items-center text-sm text-gray-600">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{formatDate(trip.start_date)} - {formatDate(trip.end_date)}</span>
      </div>

      {trip.duration_days && (
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{trip.duration_days} {trip.duration_days === 1 ? 'day' : 'days'}</span>
        </div>
      )}

      {trip.budget && (
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>${trip.budget.toLocaleString()}</span>
        </div>
      )}

      {trip.travelers_count && (
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>{trip.travelers_count} {trip.travelers_count === 1 ? 'traveler' : 'travelers'}</span>
        </div>
      )}
    </div>

    <div className="mt-4 pt-4 border-t border-gray-200">
      <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
        View Details →
      </button>
    </div>
  </div>
);

export default TripsPage;