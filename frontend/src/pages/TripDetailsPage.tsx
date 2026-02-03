/**
 * TripDetailsPage
 * 
 * Layout:
 *   Hero (photo gallery empty state) → Progress bar (collapsible) → Sticky tabs
 *   Two-column: Left content (tabs) | Right sticky summary card
 * 
 * Data: fetches the real trip from the backend via apiService.getTrip()
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { apiService } from '../services/api';
import type { Trip } from '../types';
import type { TripChatContext } from '../types/chat';
import ChatInterface from '../components/ChatInterface';
import { AnimatePresence, motion } from 'framer-motion';

// ── Local types ───────────────────────────────────────────────
type TabType = 'overview' | 'itinerary' | 'travel' | 'chat';
type TravelSubTab = 'flights' | 'hotels' | 'transport';

interface ProgressTask {
  id: string;
  label: string;
  completed: boolean;
  icon: string;
}

// ── Helper: format dates ──────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return 'Not set';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ── Helper: status badge styles ───────────────────────────────
function getStatusStyles(status: string) {
  switch (status) {
    case 'planning':
      return { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' };
    case 'booked':
      return { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' };
    case 'completed':
      return { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400' };
  }
}

// ── Helper: compute progress checklist from trip fields ───────
function getProgressTasks(trip: Trip): ProgressTask[] {
  return [
    { id: 'destination', label: 'Set Destination',   completed: !!trip.destination,                        icon: '🌍' },
    { id: 'dates',       label: 'Set Travel Dates',  completed: !!(trip.start_date && trip.end_date),      icon: '📅' },
    { id: 'budget',      label: 'Set Budget',        completed: !!trip.budget,                             icon: '💰' },
    { id: 'travelers',   label: 'Add Travelers',     completed: trip.travelers_count > 0,                  icon: '👥' },
    { id: 'itinerary',   label: 'Plan Itinerary',    completed: !!trip.trip_metadata?.itinerary,           icon: '📋' },
    { id: 'flights',     label: 'Book Flights',      completed: !!trip.trip_metadata?.flights,             icon: '✈️' },
    { id: 'hotels',      label: 'Book Hotels',       completed: !!trip.trip_metadata?.hotels,              icon: '🏨' },
    { id: 'notes',       label: 'Add Notes',         completed: !!trip.trip_metadata?.notes,               icon: '📝' },
  ];
}

// ── Main Component ────────────────────────────────────────────
export default function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { userId } = useUser();

  // ── State ─────────────────────────────────────────────────
  const [trip, setTrip]                         = useState<Trip | null>(null);
  const [isLoading, setIsLoading]               = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [activeTab, setActiveTab]               = useState<TabType>('overview');
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [menuOpen, setMenuOpen]                 = useState(false);
  const [travelSubTab, setTravelSubTab]         = useState<TravelSubTab>('flights');
  const [notes, setNotes]                       = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  // ── Fetch trip on mount ─────────────────────────────────────
  useEffect(() => {
    if (!tripId) { navigate('/trips'); return; }

    const fetchTrip = async () => {
      try {
        setIsLoading(true);
        const fetched = await apiService.getTrip(parseInt(tripId));
        setTrip(fetched);
        // Pre-fill notes from metadata if saved
        if (fetched.trip_metadata?.notes) {
          setNotes(fetched.trip_metadata.notes);
        }
      } catch (err) {
        console.error('Failed to fetch trip:', err);
        setError('Failed to load trip details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, navigate]);

  // ── Close 3-dot menu on outside click ─────────────────────
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, handleClickOutside]);

  // ── Derived state ─────────────────────────────────────────
  const progressTasks  = trip ? getProgressTasks(trip) : [];
  const completedCount = progressTasks.filter((t) => t.completed).length;
  const progressPct    = trip ? Math.round((completedCount / progressTasks.length) * 100) : 0;

  const tripContext: TripChatContext | undefined = trip
    ? {
        tripId:         trip.id,
        destination:    trip.destination,
        status:         trip.status,
        budget:         trip.budget,
        startDate:      trip.start_date,
        endDate:        trip.end_date,
        durationDays:   trip.duration_days,
        travelersCount: trip.travelers_count,
      }
    : undefined;

  // ── Loading state ─────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading trip details...</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────
  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center max-w-md mx-auto">
          <p className="text-4xl mb-3">😕</p>
          <p className="text-red-800 font-medium mb-2">{error || 'Trip not found'}</p>
          <button
            onClick={() => navigate('/trips')}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Trips
          </button>
        </div>
      </div>
    );
  }

  // ── Resolved values ───────────────────────────────────────
  const statusStyles = getStatusStyles(trip.status);
  const statusLabel  = trip.status.charAt(0).toUpperCase() + trip.status.slice(1);

  // Progress bar color: amber < 50%, blue 50–99%, green 100%
  const progressColor =
    progressPct === 100 ? '#16a34a' : progressPct >= 50 ? '#2563eb' : '#f59e0b';

  // Year for the date range display
  const endYear = trip.end_date
    ? new Date(trip.end_date).getFullYear()
    : trip.start_date
    ? new Date(trip.start_date).getFullYear()
    : null;

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ════════════════════════════════════════════════════
          HERO — photo gallery empty state
          ════════════════════════════════════════════════════ */}
      <div
        className="relative w-full overflow-hidden"
        style={{ minHeight: '260px', background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
      >
        {/* Empty-state CTA */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
               style={{ background: 'rgba(255,255,255,0.15)' }}>
            <span className="text-2xl">📷</span>
          </div>
          <p className="text-white text-sm font-medium opacity-80">Add Your Trip Photos</p>
          <button className="mt-2 px-4 py-1.5 text-white text-xs font-medium rounded-lg border border-white border-opacity-40 hover:bg-white hover:bg-opacity-10 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.15)' }}>
            + Upload Photos
          </button>
        </div>

        {/* Bottom overlay — trip name + status + back button */}
        <div className="absolute bottom-0 left-0 right-0 px-6 py-5"
             style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
          <div className="max-w-7xl mx-auto flex items-end justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">{trip.destination}</h1>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusStyles.bg} ${statusStyles.text}`}>
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
            <button onClick={() => navigate('/trips')}
                    className="text-white text-sm font-medium opacity-70 hover:opacity-100 transition-opacity flex items-center gap-1">
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          PROGRESS BAR — collapsible
          ════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Collapsed row */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setProgressExpanded(!progressExpanded)}
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Progress</span>
            <span className="text-sm font-bold text-gray-900">{progressPct}%</span>

            {/* Bar */}
            <div className="flex-1 max-w-[240px] h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressColor }} />
            </div>

            <span className="text-xs text-gray-400">{completedCount}/{progressTasks.length} tasks</span>
            <span className="text-gray-400 text-xs">{progressExpanded ? '▲' : '▼ View Details'}</span>
          </div>

          {/* Expanded checklist */}
          {progressExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              {progressTasks.map((task) => (
                <div key={task.id} className={`flex items-center gap-2 text-sm ${task.completed ? 'text-green-700' : 'text-gray-400'}`}>
                  <span>{task.completed ? '✅' : task.icon}</span>
                  <span className={task.completed ? 'line-through opacity-70' : ''}>{task.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          TAB NAVIGATION — sticky + 3-dot menu
          ════════════════════════════════════════════════════ */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-0.5">
              {(
                [
                  { key: 'overview',   label: 'Overview',   emoji: '📋' },
                  { key: 'itinerary',  label: 'Itinerary',  emoji: '📅' },
                  { key: 'travel',     label: 'Travel',     emoji: '✈️' },
                  { key: 'chat',       label: 'Chat',       emoji: '💬' },
                ] as const
              ).map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>

            {/* 3-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-xl leading-none"
              >
                ⋮
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-20">
                  <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    ✏️ Edit Trip
                  </button>
                  <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    📤 Share Trip
                  </button>
                  <div className="border-t border-gray-100" />
                  <button className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                    🗑️ Delete Trip
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          MAIN BODY — two-column layout
          ════════════════════════════════════════════════════ */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── LEFT: Tab content (scrollable) ─────────────── */}
          <div className="flex-1" style={{ minWidth: 0 }}>
            <AnimatePresence mode="wait">
           {/* ▸ OVERVIEW TAB ──────────────────────────────── */}
           {activeTab === 'overview' && (
              <motion.div key="overview" className="space-y-5" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>

                {/* About this trip */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-2">About This Trip</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {trip.trip_metadata?.description ||
                      `Your${trip.duration_days ? ` ${trip.duration_days}-day` : ''} adventure to ${trip.destination}. Use the tabs above to plan your itinerary, book travel, or chat with the AI assistant.`}
                  </p>
                </div>

                {/* Key Details grid */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-4">Key Details</h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: 'Destination', value: trip.destination,                                        icon: '🌍' },
                      { label: 'Duration',    value: trip.duration_days ? `${trip.duration_days} days` : 'Not set',  icon: '⏱️' },
                      { label: 'Budget',      value: trip.budget ? `$${trip.budget.toLocaleString()}` : 'Not set',   icon: '💰' },
                      { label: 'Travelers',   value: `${trip.travelers_count}`,                              icon: '👥' },
                    ].map(({ label, value, icon }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{icon} {label}</p>
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
                      <strong>Coming Soon</strong> — Real-time travel alerts and advisories for {trip.destination} will appear here.
                    </p>
                  </div>
                </div>

                {/* AI Recommendations — placeholder */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">🤖 AI Recommendations</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Coming Soon</strong> — Personalized recommendations for {trip.destination} powered by AI will appear here.
                    </p>
                  </div>
                </div>

              </motion.div>
            )}

            {/* ▸ ITINERARY TAB ─────────────────────────────── */}
            {activeTab === 'itinerary' && (
              <motion.div key="itinerary" className="space-y-5" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>

                {/* Empty state */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📅</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No itinerary yet</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                      Let AI plan your perfect{trip.duration_days ? ` ${trip.duration_days}-day` : ''} {trip.destination.toLowerCase()} adventure
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
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">📝 Trip Notes</h4>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes, reminders, or ideas for your trip..."
                    className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white resize-none transition-colors"
                    rows={4}
                  />
                </div>

              </motion.div>
            )}

            {/* ▸ TRAVEL TAB ────────────────────────────────── */}
            {activeTab === 'travel' && (
              <motion.div key="travel" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>

                {/* Sub-tab bar */}
                <div className="flex border-b border-gray-200">
                  {(
                    [
                      { key: 'flights',   label: 'Flights',   emoji: '✈️' },
                      { key: 'hotels',    label: 'Hotels',    emoji: '🏨' },
                      { key: 'transport', label: 'Transport', emoji: '🚗' },
                    ] as const
                  ).map(({ key, label, emoji }) => (
                    <button
                      key={key}
                      onClick={() => setTravelSubTab(key)}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        travelSubTab === key
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
                      {travelSubTab === 'flights' ? '✈️' : travelSubTab === 'hotels' ? '🏨' : '🚗'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    No {travelSubTab === 'flights' ? 'flights' : travelSubTab === 'hotels' ? 'hotels' : 'transport'} booked yet
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                    {travelSubTab === 'flights'   && `Find the best flights for your ${trip.destination} trip`}
                    {travelSubTab === 'hotels'    && `Find accommodation in ${trip.destination}`}
                    {travelSubTab === 'transport' && `Plan local transport in ${trip.destination}`}
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

              </motion.div>
            )}

            {/* ▸ CHAT TAB ──────────────────────────────────── */}
            {activeTab === 'chat' && (
              <motion.div key="chat" className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden" style={{ height: '520px' }} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }}>

                <ChatInterface
                  userId={userId!}
                  chatType="trip"
                  tripId={trip.id}
                  tripContext={tripContext}
                  embedded={true}
                />

              </motion.div>
            )}

            </AnimatePresence>
          </div>
          {/* ── RIGHT: Sticky summary card ─────────────────── */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="lg:sticky lg:top-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">Trip Summary</h3>

              {/* Status badge */}
              <div className="mb-5">
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyles.bg} ${statusStyles.text}`}>
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
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: progressColor }} />
                </div>
              </div>

              {/* Quick-action buttons */}
              <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col gap-2">
                <button
                  onClick={() => setActiveTab('chat')}
                  className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  💬 Chat About This Trip
                </button>
                <button
                  onClick={() => setActiveTab('itinerary')}
                  className="w-full px-4 py-2.5 bg-white text-gray-700 rounded-lg text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  📋 Plan Itinerary
                </button>
              </div>
            </div>
          </div>

          </div>
      </div>
    </div>
  );
}