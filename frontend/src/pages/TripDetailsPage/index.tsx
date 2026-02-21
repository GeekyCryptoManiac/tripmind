/**
 * TripDetailsPage — Redesigned Week 7 + Week 8
 *
 * Visual updates (Week 7):
 *   - Tab emojis replaced with SVG icons
 *   - Brand blue instead of bright blue throughout
 *   - Surface-bg instead of gray-50
 *   - Simplified TripSummaryCard interface (self-contained status rendering)
 *   - Warm color palette for loading/menu states
 *
 * Week 8:
 *   - Spinner replaced with TripDetailsSkeleton — mirrors actual page
 *     structure (hero / progress bar / tab nav / 2-column body + sidebar)
 *     so the layout doesn't shift when content loads
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUser } from '../../context/UserContext';
import { apiService } from '../../services/api';
import type { Trip } from '../../types';
import type { TripChatContext } from '../../types/chat';
import ChatInterface from '../../components/ChatInterface';
import TripEditModal from '../../components/TripEditModal';
import TripDetailsHero from './TripDetailsHero';
import TripDetailsProgress from './TripDetailsProgress';
import TripSummaryCard from './TripSummaryCard';
import OverviewTab from './OverviewTab';
import ItineraryTab from './ItineraryTab';
import TravelTab from './TravelTab';
import StatusBanner from './StatusBanner';
import { useTripPhase } from '../../utils/tripStatus';
import { exportTripPDF } from '../../utils/exportPDF';
import { type TabType, type TravelSubTab, getProgressTasks } from './helpers';
import ErrorBoundary from '../../components/ErrorBoundary';

// ── SVG Icons ─────────────────────────────────────────────────
const OverviewIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const PlaneIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
  </svg>
);

const ChatIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const EditIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const DocumentIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const TrashIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DotsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

// ── Trip Details Skeleton ─────────────────────────────────────
// Mirrors the exact structure of the loaded page so there is zero
// layout shift when data arrives:
//   hero (260px) → progress strip → tab nav → 2-col body + sidebar
function TripDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-surface-bg">

      {/* Hero — matches TripDetailsHero minHeight: 260px */}
      <div className="relative w-full animate-pulse" style={{ minHeight: '260px' }}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200" />
        {/* Back button */}
        <div className="absolute bottom-5 right-6 h-8 w-16 bg-white/60 rounded-xl" />
        {/* Destination title + badge + date */}
        <div className="absolute bottom-5 left-6 space-y-2">
          <div className="h-10 w-56 bg-white/50 rounded-xl" />
          <div className="flex items-center gap-3">
            <div className="h-6 w-20 bg-white/50 rounded-full" />
            <div className="h-4 w-36 bg-white/40 rounded" />
          </div>
        </div>
      </div>

      {/* Progress bar strip */}
      <div className="h-2 bg-gray-200 w-full" />

      {/* Tab nav — 4 tabs + dots menu */}
      <div className="bg-white border-b border-surface-muted shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 py-0.5">
            {[100, 84, 72, 64].map((w, i) => (
              <div
                key={i}
                className="h-11 rounded animate-pulse bg-gray-100"
                style={{ width: `${w}px` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Body — mirrors the flex-row layout */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: main content column */}
          <div className="flex-1 space-y-4">

            {/* Key details grid card */}
            <div className="bg-white rounded-2xl p-6 ring-1 ring-black/[0.03] shadow-sm animate-pulse">
              <div className="h-5 w-32 bg-gray-200 rounded mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-surface-bg rounded-xl p-3">
                    <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
                    <div className="h-4 w-24 bg-gray-300 rounded" />
                  </div>
                ))}
              </div>
            </div>

            {/* Description / notes card */}
            <div className="bg-white rounded-2xl p-6 ring-1 ring-black/[0.03] shadow-sm animate-pulse">
              <div className="h-5 w-24 bg-gray-200 rounded mb-4" />
              <div className="space-y-2.5">
                <div className="h-4 w-full bg-gray-100 rounded" />
                <div className="h-4 w-5/6 bg-gray-100 rounded" />
                <div className="h-4 w-4/6 bg-gray-100 rounded" />
              </div>
            </div>

            {/* Tools / recommendations card */}
            <div className="bg-white rounded-2xl p-6 ring-1 ring-black/[0.03] shadow-sm animate-pulse">
              <div className="h-5 w-28 bg-gray-200 rounded mb-4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3.5 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-48 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: sidebar — mirrors TripSummaryCard (lg:w-80 xl:w-96) */}
          <div className="lg:w-80 xl:w-96 shrink-0">
            <div className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm p-6 animate-pulse">

              {/* "Trip Summary" heading */}
              <div className="h-5 w-28 bg-gray-200 rounded mb-4 pb-3 border-b border-surface-muted" />

              {/* Status badge */}
              <div className="h-6 w-20 bg-gray-100 rounded-full mb-5" />

              {/* Detail rows (dates, budget, travelers, destination) */}
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded bg-gray-100 flex-shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-32 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="mt-5 pt-5 border-t border-surface-muted">
                <div className="flex justify-between mb-2">
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                  <div className="h-3 w-8 bg-gray-100 rounded" />
                </div>
                <div className="h-2 bg-gray-100 rounded-full" />
              </div>

              {/* Action buttons */}
              <div className="mt-5 pt-5 border-t border-surface-muted flex flex-col gap-2">
                <div className="h-10 w-full bg-gray-200 rounded-xl" />
                <div className="h-10 w-full bg-gray-100 rounded-xl" />
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function TripDetailsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { userId } = useUser();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [progressExpanded, setProgressExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [travelSubTab, setTravelSubTab] = useState<TravelSubTab>('flights');
  const [notes, setNotes] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const menuRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInitializedNotes = useRef(false);

  // ── Fetch trip ────────────────────────────────────────────
  useEffect(() => {
    if (!tripId) {
      navigate('/trips');
      return;
    }

    const fetchTrip = async () => {
      try {
        setIsLoading(true);
        const fetched = await apiService.getTrip(parseInt(tripId));
        setTrip(fetched);
        if (fetched.trip_metadata?.notes) {
          setNotes(fetched.trip_metadata.notes);
        }
        hasInitializedNotes.current = true;
      } catch (err) {
        console.error('Failed to fetch trip:', err);
        setError('Failed to load trip details.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [tripId, navigate]);

  // ── Close menu on outside click ───────────────────────────
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setMenuOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, handleClickOutside]);

  // ── Auto-save notes ───────────────────────────────────────
  useEffect(() => {
    if (!hasInitializedNotes.current) return;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await apiService.updateTrip(parseInt(tripId!), { notes });
        setTrip((prev) =>
          prev ? { ...prev, trip_metadata: { ...prev.trip_metadata, notes } } : prev
        );
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        console.error('Failed to save notes:', err);
        setSaveStatus('error');
      }
    }, 1000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [notes, tripId]);

  // ── Derived state ─────────────────────────────────────────
  const progressTasks = trip ? getProgressTasks(trip) : [];
  const completedCount = progressTasks.filter((t) => t.completed).length;
  const progressPct = trip ? Math.round((completedCount / progressTasks.length) * 100) : 0;

  // Progress bar color: amber < 50%, brand-500 50–99%, emerald-500 100%
  const progressColor = progressPct === 100 ? '#10b981' : progressPct >= 50 ? '#7c3aed' : '#f59e0b';


  const tripContext: TripChatContext | undefined = trip
    ? {
        tripId: trip.id,
        destination: trip.destination,
        status: trip.status,
        budget: trip.budget,
        startDate: trip.start_date,
        endDate: trip.end_date,
        durationDays: trip.duration_days,
        travelersCount: trip.travelers_count,
      }
    : undefined;

  const { phase, daysUntil, currentDay } = trip
    ? useTripPhase(trip)
    : { phase: 'planning' as const, daysUntil: 0, currentDay: 1 };

  // ── Loading state — full skeleton, no spinner ─────────────
  if (isLoading) return <TripDetailsSkeleton />;

  // ── Error / not found ─────────────────────────────────────
  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-amber-800 font-medium mb-2">{error || 'Trip not found'}</p>
          <button
            onClick={() => navigate('/trips')}
            className="text-brand-600 hover:text-brand-700 text-sm font-medium"
          >
            ← Back to Trips
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-bg">

      {/* Hero */}
      <TripDetailsHero trip={trip} phase={phase} onBack={() => navigate('/trips')} />

      {/* Progress Bar */}
      <TripDetailsProgress
        progressPct={progressPct}
        progressColor={progressColor}
        progressTasks={progressTasks}
        completedCount={completedCount}
        isExpanded={progressExpanded}
        onToggle={() => setProgressExpanded(!progressExpanded)}
      />

      {/* Status Banner */}
      <StatusBanner
        phase={phase}
        daysUntil={daysUntil}
        currentDay={currentDay}
        totalDays={trip.duration_days ?? 1}
        destination={trip.destination}
      />

      {/* Tab Navigation */}
      <div className="bg-white border-b border-surface-muted sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between">

            {/* Tabs */}
            <div className="flex gap-0.5">
              {[
                { key: 'overview'  as const, label: 'Overview',  Icon: OverviewIcon  },
                { key: 'itinerary' as const, label: 'Itinerary', Icon: CalendarIcon  },
                { key: 'travel'    as const, label: 'Travel',    Icon: PlaneIcon     },
                { key: 'chat'      as const, label: 'Chat',      Icon: ChatIcon      },
              ].map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === key
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-ink-secondary hover:text-ink hover:bg-surface-bg'
                  }`}
                >
                  <Icon />
                  {label}
                </button>
              ))}
            </div>

            {/* 3-dot menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-2 text-ink-tertiary hover:text-ink hover:bg-surface-bg rounded-lg transition-colors"
              >
                <DotsIcon />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden z-20">
                  <button
                    onClick={() => { setEditModalOpen(true); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface-bg transition-colors flex items-center gap-2"
                  >
                    <EditIcon />
                    Edit Trip
                  </button>
                  <button
                    onClick={() => { exportTripPDF(trip); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm text-ink hover:bg-surface-bg transition-colors flex items-center gap-2"
                  >
                    <DocumentIcon />
                    Export PDF
                  </button>
                  <div className="border-t border-surface-muted" />
                  <button className="w-full text-left px-4 py-2.5 text-sm text-amber-600 hover:bg-amber-50 transition-colors flex items-center gap-2">
                    <TrashIcon />
                    Delete Trip
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: Tab content */}
          <ErrorBoundary label="Trip Details" resetOnChange={tripId}>
            <div className="flex-1" style={{ minWidth: 0 }}>
              <AnimatePresence mode="wait">

                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <OverviewTab trip={trip} phase={phase} onTripUpdate={setTrip} />
                  </motion.div>
                )}

                {activeTab === 'itinerary' && (
                  <motion.div
                    key="itinerary"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ItineraryTab
                      trip={trip}
                      notes={notes}
                      saveStatus={saveStatus}
                      onNotesChange={setNotes}
                      onTripUpdate={setTrip}
                      phase={phase}
                      currentDay={currentDay}
                    />
                  </motion.div>
                )}

                {activeTab === 'travel' && (
                  <motion.div
                    key="travel"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <TravelTab
                      trip={trip}
                      activeSubTab={travelSubTab}
                      onSubTabChange={setTravelSubTab}
                    />
                  </motion.div>
                )}

                {activeTab === 'chat' && (
                  <motion.div
                    key="chat"
                    className="bg-white rounded-2xl ring-1 ring-black/[0.03] shadow-sm overflow-hidden"
                    style={{ height: '520px' }}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.2 }}
                  >
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
          </ErrorBoundary>

          {/* Right: Sticky summary card */}
          <TripSummaryCard
            trip={trip}
            phase={phase}
            progressPct={progressPct}
            progressColor={progressColor}
            onChatClick={() => setActiveTab('chat')}
            onItineraryClick={() => setActiveTab('itinerary')}
          />

        </div>
      </div>

      {/* Trip Edit Modal */}
      {trip && (
        <TripEditModal
          trip={trip}
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          onSave={(updated) => {
            setTrip(updated);
            setEditModalOpen(false);
          }}
        />
      )}

    </div>
  );
}